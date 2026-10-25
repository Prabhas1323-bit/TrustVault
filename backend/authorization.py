from typing import Tuple, Optional
from flask import request
from .models import db, User, Document, Permission, AuditLog

ALLOWED_ACTIONS = {'VIEW', 'DOWNLOAD', 'EDIT', 'DELETE', 'SHARE', 'REVOKE'}

def authorize_action(
    user: Optional[User],
    doc: Optional[Document],
    action: str
) -> Tuple[bool, str]:
    """
    Centralized Server-Side Authorization Policy Engine

    Enforces strict zero-trust access control:
    - Default DENY.
    - Unauthenticated requests denied.
    - Inactive accounts immediately denied.
    - Non-existent documents return 404 (or generic 403).
    - Document Owners have full rights: VIEW, DOWNLOAD, EDIT, DELETE, SHARE, REVOKE.
    - Viewers with VIEW grant: VIEW, DOWNLOAD. No edit, delete, or share.
    - Viewers with EDIT grant: VIEW, DOWNLOAD, EDIT. No delete, share, or revoke.
    - Admins: Audit view and download under administrative policy; no delete or share.
    - Unshared users: DENIED.
    """
    if not user:
        return False, "Authentication required"

    if not user.is_active:
        return False, "Account is deactivated"

    if not doc:
        return False, "Document not found"

    if action not in ALLOWED_ACTIONS:
        return False, f"Unsupported action: {action}"

    # Owner has full authorization
    if user.id == doc.owner_id:
        return True, "Owner authorized"

    # Per-document active permission grant lookup
    grant = Permission.query.filter_by(document_id=doc.id, user_id=user.id).first()

    if action in ('VIEW', 'DOWNLOAD'):
        if grant and grant.permission_level in ('VIEW', 'EDIT'):
            return True, f"Authorized by {grant.permission_level} grant"
        if user.role == 'admin':
            return True, "Authorized under administrative audit oversight"
        return False, "Access denied: document is not shared with you"

    if action == 'EDIT':
        if grant and grant.permission_level == 'EDIT':
            return True, "Authorized by EDIT grant"
        return False, "Access denied: EDIT permission required"

    if action in ('SHARE', 'REVOKE'):
        return False, "Access denied: only document owner may manage sharing permissions"

    if action == 'DELETE':
        return False, "Access denied: only document owner may delete document"

    return False, "Access denied by default policy"


def record_audit(
    actor_id: str,
    actor_email: str,
    action: str,
    resource_type: str,
    resource_id: str,
    status: str,
    ip_address: Optional[str] = None,
    details: str = '',
    user_agent: Optional[str] = None
):
    """
    Safely writes an audit record.
    Never logs passwords, tokens, encryption keys, or private document payloads.
    """
    try:
        ip = ip_address or (request.remote_addr if request else '127.0.0.1') or '127.0.0.1'
        ua = user_agent or (request.headers.get('User-Agent', '')[:250] if request else '')
        log = AuditLog(
            actor_id=actor_id,
            actor_email=actor_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            status=status,
            ip_address=ip,
            user_agent=ua,
            details=details
        )
        db.session.add(log)
        db.session.commit()
    except Exception:
        db.session.rollback()
