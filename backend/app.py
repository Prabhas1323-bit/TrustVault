import os
import uuid
import re
from datetime import datetime
from flask import Flask, request, jsonify, session, send_file
from werkzeug.utils import secure_filename
from .models import db, User, Document, Permission, AuditLog
from .authorization import authorize_action, record_audit

UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'storage', 'vault_files'))
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc', 'xlsx', 'txt', 'csv', 'md', 'png', 'jpg', 'jpeg'}
MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB

def create_app(test_config=None):
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'trustvault-dev-secret-key-change-in-prod-2026')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:////tmp/trustvault.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

    if test_config:
        app.config.update(test_config)

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    db.init_app(app)

    with app.app_context():
        db.create_all()

    def get_current_user():
        user_id = session.get('user_id')
        # Also support Authorization: Bearer <user_id> for testing/API requests
        if not user_id:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                user_id = auth_header.split(' ')[1]
        if not user_id:
            return None
        return db.session.get(User, user_id)

    def sanitize_file_name(filename: str) -> str:
        # Strip directory traversal
        filename = re.sub(r'(\.\.[/\\])+', '', filename)
        cleaned = secure_filename(filename)
        return cleaned or 'unnamed_file'

    # --- AUTH ENDPOINTS ---

    @app.route('/api/auth/register', methods=['POST'])
    def register():
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        name = (data.get('name') or '').strip()

        if not email or not password or not name:
            return jsonify({'error': 'Name, email and password are required'}), 400

        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters long'}), 400

        # Public registration NEVER allows self-promotion to admin
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'An account with this email already exists'}), 400

        user = User(email=email, name=name, role='owner')
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        session['user_id'] = user.id
        record_audit(user.id, user.email, 'REGISTER_SUCCESS', 'USER', user.id, 'SUCCESS', details='New account created')

        return jsonify({'message': 'Registration successful', 'user': user.to_dict()}), 201

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            record_audit('anonymous', email, 'LOGIN_FAILURE', 'AUTH', 'none', 'FAILED', details='Invalid credentials')
            return jsonify({'error': 'Invalid email or password'}), 401

        if not user.is_active:
            record_audit(user.id, user.email, 'LOGIN_FAILURE', 'AUTH', user.id, 'DENIED', details='Account deactivated')
            return jsonify({'error': 'This account has been deactivated by an administrator'}), 403

        # Rotate session on authentication
        session.clear()
        session['user_id'] = user.id
        record_audit(user.id, user.email, 'LOGIN_SUCCESS', 'AUTH', user.id, 'SUCCESS', details=f'Role: {user.role}')

        return jsonify({'message': 'Login successful', 'user': user.to_dict()})

    @app.route('/api/auth/logout', methods=['POST'])
    def logout():
        user = get_current_user()
        if user:
            record_audit(user.id, user.email, 'LOGOUT', 'AUTH', user.id, 'SUCCESS')
        session.clear()
        return jsonify({'message': 'Logged out successfully'})

    @app.route('/api/auth/me', methods=['GET'])
    def me():
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Not authenticated'}), 401
        if not user.is_active:
            session.clear()
            return jsonify({'error': 'Account deactivated'}), 403
        return jsonify({'user': user.to_dict()})

    @app.route('/api/auth/change-password', methods=['POST'])
    def change_password():
        user = get_current_user()
        if not user or not user.is_active:
            return jsonify({'error': 'Authentication required'}), 401

        data = request.get_json() or {}
        current_password = data.get('currentPassword', '')
        new_password = data.get('newPassword', '')

        if not user.check_password(current_password):
            record_audit(user.id, user.email, 'PASSWORD_CHANGE_FAILURE', 'USER', user.id, 'DENIED', details='Incorrect current password')
            return jsonify({'error': 'Current password does not match'}), 400

        if len(new_password) < 8:
            return jsonify({'error': 'New password must be at least 8 characters long'}), 400

        user.set_password(new_password)
        db.session.commit()
        record_audit(user.id, user.email, 'PASSWORD_CHANGE_SUCCESS', 'USER', user.id, 'SUCCESS')

        return jsonify({'message': 'Password changed successfully'})

    # --- DOCUMENT ENDPOINTS ---

    @app.route('/api/documents', methods=['GET'])
    def list_documents():
        user = get_current_user()
        if not user or not user.is_active:
            return jsonify({'error': 'Authentication required'}), 401

        # Viewers and Owners only see authorized documents:
        # 1. Documents they own
        # 2. Documents explicitly shared with them
        # (Admins see all for system audit oversight)
        if user.role == 'admin':
            docs = Document.query.order_by(Document.created_at.desc()).all()
        else:
            owned = Document.query.filter_by(owner_id=user.id).all()
            shared_doc_ids = [p.document_id for p in Permission.query.filter_by(user_id=user.id).all()]
            shared = Document.query.filter(Document.id.in_(shared_doc_ids)).all() if shared_doc_ids else []
            # Combine unique
            doc_map = {d.id: d for d in (owned + shared)}
            docs = sorted(doc_map.values(), key=lambda d: d.created_at, reverse=True)

        return jsonify({'documents': [d.to_dict(user=user) for d in docs]})

    @app.route('/api/documents/upload', methods=['POST'])
    def upload_document():
        user = get_current_user()
        if not user or not user.is_active:
            return jsonify({'error': 'Authentication required'}), 401

        # Only owners (and admins) can upload documents; pure viewers cannot
        if user.role == 'viewer':
            record_audit(user.id, user.email, 'AUTHORIZATION_DENIED', 'DOCUMENT', 'upload', 'DENIED', details='Viewer role cannot upload documents')
            return jsonify({'error': 'Viewer accounts cannot upload documents'}), 403

        if 'file' not in request.files:
            return jsonify({'error': 'No file part in request'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        original_filename = sanitize_file_name(file.filename)
        ext = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else ''
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify({'error': f'Disallowed file type: .{ext}'}), 400

        # Read file bytes to check size
        file_bytes = file.read()
        file_size = len(file_bytes)
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': 'File exceeds 10MB limit'}), 400

        # Unique stored filename prevents overwrite and path traversal
        stored_filename = f"{uuid.uuid4().hex}_{original_filename}"
        storage_path = os.path.join(app.config['UPLOAD_FOLDER'], stored_filename)

        with open(storage_path, 'wb') as f:
            f.write(file_bytes)

        title = request.form.get('title') or original_filename
        category = request.form.get('category') or 'Other'
        description = request.form.get('description') or ''

        doc = Document(
            title=title,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_size=file_size,
            mime_type=file.content_type or 'application/octet-stream',
            category=category,
            description=description,
            owner_id=user.id
        )
        db.session.add(doc)
        db.session.commit()

        # Optional initial share
        share_with_id = request.form.get('shareWithUserId')
        share_level = request.form.get('sharePermissionLevel', 'VIEW')
        if share_with_id and share_with_id != user.id:
            target_user = db.session.get(User, share_with_id)
            if target_user:
                perm = Permission(
                    document_id=doc.id,
                    user_id=target_user.id,
                    permission_level=share_level,
                    granted_by_id=user.id
                )
                db.session.add(perm)
                db.session.commit()

        record_audit(user.id, user.email, 'DOCUMENT_UPLOAD', 'DOCUMENT', doc.id, 'SUCCESS', details=f"Title: {doc.title}, Size: {file_size}")
        return jsonify({'message': 'Document uploaded successfully', 'document': doc.to_dict(user=user)}), 201

    @app.route('/api/documents/<doc_id>', methods=['GET'])
    def get_document(doc_id):
        user = get_current_user()
        doc = db.session.get(Document, doc_id)
        allowed, reason = authorize_action(user, doc, 'VIEW')
        if not allowed:
            record_audit(user.id if user else 'anonymous', user.email if user else 'none', 'AUTHORIZATION_DENIED', 'DOCUMENT', doc_id, 'DENIED', details=reason)
            return jsonify({'error': reason}), 403

        return jsonify({'document': doc.to_dict(user=user)})

    @app.route('/api/documents/<doc_id>/download', methods=['GET'])
    def download_document(doc_id):
        user = get_current_user()
        doc = db.session.get(Document, doc_id)
        allowed, reason = authorize_action(user, doc, 'DOWNLOAD')
        if not allowed:
            record_audit(user.id if user else 'anonymous', user.email if user else 'none', 'AUTHORIZATION_DENIED', 'DOCUMENT', doc_id, 'DENIED', details=f"Download attempt blocked: {reason}")
            return jsonify({'error': reason}), 403

        file_path = os.path.join(app.config['UPLOAD_FOLDER'], doc.stored_filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'Stored file not found on disk'}), 404

        record_audit(user.id, user.email, 'DOCUMENT_DOWNLOAD', 'DOCUMENT', doc.id, 'SUCCESS', details=f"File: {doc.original_filename}")
        return send_file(file_path, as_attachment=True, download_name=doc.original_filename, mimetype=doc.mime_type)

    @app.route('/api/documents/<doc_id>', methods=['PATCH'])
    def update_document_metadata(doc_id):
        user = get_current_user()
        doc = db.session.get(Document, doc_id)
        allowed, reason = authorize_action(user, doc, 'EDIT')
        if not allowed:
            record_audit(user.id if user else 'anonymous', user.email if user else 'none', 'AUTHORIZATION_DENIED', 'DOCUMENT', doc_id, 'DENIED', details=f"Metadata edit blocked: {reason}")
            return jsonify({'error': reason}), 403

        data = request.get_json() or {}
        if 'title' in data and data['title'].strip():
            doc.title = data['title'].strip()
        if 'category' in data and data['category'].strip():
            doc.category = data['category'].strip()
        if 'description' in data:
            doc.description = data['description']

        doc.updated_at = datetime.utcnow()
        db.session.commit()

        record_audit(user.id, user.email, 'METADATA_UPDATE', 'DOCUMENT', doc.id, 'SUCCESS', details=f"Updated title: {doc.title}")
        return jsonify({'message': 'Metadata updated', 'document': doc.to_dict(user=user)})

    @app.route('/api/documents/<doc_id>', methods=['DELETE'])
    def delete_document(doc_id):
        user = get_current_user()
        doc = db.session.get(Document, doc_id)
        allowed, reason = authorize_action(user, doc, 'DELETE')
        if not allowed:
            record_audit(user.id if user else 'anonymous', user.email if user else 'none', 'AUTHORIZATION_DENIED', 'DOCUMENT', doc_id, 'DENIED', details=f"Delete blocked: {reason}")
            return jsonify({'error': reason}), 403

        # Remove physical file safely
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], doc.stored_filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        doc_title = doc.title
        db.session.delete(doc)
        db.session.commit()

        record_audit(user.id, user.email, 'DOCUMENT_DELETE', 'DOCUMENT', doc_id, 'SUCCESS', details=f"Deleted document: {doc_title}")
        return jsonify({'message': 'Document deleted successfully'})

    # --- SHARING & PERMISSIONS ---

    @app.route('/api/documents/<doc_id>/permissions', methods=['GET'])
    def get_document_permissions(doc_id):
        user = get_current_user()
        doc = db.session.get(Document, doc_id)
        if not doc:
            return jsonify({'error': 'Document not found'}), 404

        # Only the owner and admin can view permission lists
        if not user or (user.id != doc.owner_id and user.role != 'admin'):
            return jsonify({'error': 'Only the document owner can inspect permissions'}), 403

        permissions = Permission.query.filter_by(document_id=doc.id).all()
        return jsonify({'permissions': [p.to_dict() for p in permissions]})

    @app.route('/api/documents/<doc_id>/permissions', methods=['POST'])
    def grant_permission(doc_id):
        user = get_current_user()
        doc = db.session.get(Document, doc_id)
        allowed, reason = authorize_action(user, doc, 'SHARE')
        if not allowed:
            record_audit(user.id if user else 'anonymous', user.email if user else 'none', 'AUTHORIZATION_DENIED', 'PERMISSION', doc_id, 'DENIED', details=f"Share blocked: {reason}")
            return jsonify({'error': reason}), 403

        data = request.get_json() or {}
        recipient_id = data.get('userId')
        level = data.get('permissionLevel', 'VIEW')

        if level not in ('VIEW', 'EDIT'):
            return jsonify({'error': 'Permission level must be VIEW or EDIT'}), 400

        recipient = db.session.get(User, recipient_id)
        if not recipient:
            return jsonify({'error': 'Recipient user not found'}), 404

        if recipient.id == doc.owner_id:
            return jsonify({'error': 'Owner already has full rights'}), 400

        # Check existing grant
        existing = Permission.query.filter_by(document_id=doc.id, user_id=recipient.id).first()
        if existing:
            existing.permission_level = level
            existing.granted_by_id = user.id
            existing.granted_at = datetime.utcnow()
        else:
            perm = Permission(
                document_id=doc.id,
                user_id=recipient.id,
                permission_level=level,
                granted_by_id=user.id
            )
            db.session.add(perm)

        db.session.commit()
        record_audit(user.id, user.email, 'PERMISSION_GRANT', 'PERMISSION', doc.id, 'SUCCESS', details=f"Granted {level} to {recipient.email}")

        return jsonify({'message': f'Permission {level} granted to {recipient.email}'}), 201

    @app.route('/api/documents/<doc_id>/permissions/<user_id>', methods=['DELETE'])
    def revoke_permission(doc_id, user_id):
        user = get_current_user()
        doc = db.session.get(Document, doc_id)
        allowed, reason = authorize_action(user, doc, 'REVOKE')
        if not allowed:
            record_audit(user.id if user else 'anonymous', user.email if user else 'none', 'AUTHORIZATION_DENIED', 'PERMISSION', doc_id, 'DENIED', details=f"Revoke blocked: {reason}")
            return jsonify({'error': reason}), 403

        perm = Permission.query.filter_by(document_id=doc.id, user_id=user_id).first()
        if not perm:
            return jsonify({'error': 'Permission grant not found'}), 404

        recipient_email = perm.user.email if perm.user else user_id
        db.session.delete(perm)
        db.session.commit()

        record_audit(user.id, user.email, 'PERMISSION_REVOKE', 'PERMISSION', doc.id, 'SUCCESS', details=f"Revoked permission from {recipient_email}")
        return jsonify({'message': 'Permission revoked successfully'})

    # --- ADMIN & AUDIT ENDPOINTS ---

    @app.route('/api/admin/audit-logs', methods=['GET'])
    def get_audit_logs():
        user = get_current_user()
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin role required to view audit logs'}), 403

        logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(150).all()
        return jsonify({'logs': [l.to_dict() for l in logs]})

    @app.route('/api/admin/users', methods=['GET'])
    def get_users():
        user = get_current_user()
        # Non-admins can get basic user directory for sharing dropdown (id, name, email only)
        if not user:
            return jsonify({'error': 'Authentication required'}), 401

        if user.role == 'admin':
            users = User.query.order_by(User.created_at.desc()).all()
            return jsonify({'users': [u.to_dict() for u in users]})
        else:
            # Active users directory for sharing
            users = User.query.filter_by(is_active=True).all()
            return jsonify({'users': [{'id': u.id, 'name': u.name, 'email': u.email} for u in users]})

    @app.route('/api/admin/users/<target_user_id>/toggle-status', methods=['POST'])
    def toggle_user_status(target_user_id):
        user = get_current_user()
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin role required'}), 403

        target = db.session.get(User, target_user_id)
        if not target:
            return jsonify({'error': 'User not found'}), 404

        if target.id == user.id:
            return jsonify({'error': 'Cannot deactivate own administrator account'}), 400

        target.is_active = not target.is_active
        db.session.commit()

        record_audit(user.id, user.email, 'USER_STATUS_CHANGE', 'USER', target.id, 'SUCCESS', details=f"Set isActive={target.is_active} for {target.email}")
        return jsonify({'message': f"User {'activated' if target.is_active else 'deactivated'}", 'user': target.to_dict()})

    # --- DASHBOARD STATS ---

    @app.route('/api/stats', methods=['GET'])
    def get_stats():
        user = get_current_user()
        if not user or not user.is_active:
            return jsonify({'error': 'Authentication required'}), 401

        total_users = User.query.count()
        total_documents = Document.query.count()
        total_bytes = sum(d.file_size for d in Document.query.all())
        shared_docs_count = len({p.document_id for p in Permission.query.all()})
        active_grants_count = Permission.query.count()
        recent_audit_count = AuditLog.query.count()
        denied_attempts_count = AuditLog.query.filter_by(status='DENIED').count()

        my_docs_count = Document.query.filter_by(owner_id=user.id).count()
        shared_with_me = Permission.query.filter_by(user_id=user.id).count()

        return jsonify({
            'stats': {
                'totalUsers': total_users,
                'totalDocuments': total_documents,
                'totalStorageBytes': total_bytes,
                'sharedDocumentsCount': shared_docs_count,
                'activeGrantsCount': active_grants_count,
                'recentAuditCount': recent_audit_count,
                'deniedAttemptsCount': denied_attempts_count,
                'myDocumentsCount': my_docs_count,
                'sharedWithMeCount': shared_with_me
            }
        })

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(port=5000, debug=False)
