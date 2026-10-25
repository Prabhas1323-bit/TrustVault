import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='owner') # admin, owner, viewer
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    documents = db.relationship('Document', backref='owner', lazy=True, cascade='all, delete-orphan')
    permissions_received = db.relationship('Permission', foreign_keys='Permission.user_id', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password: str):
        # Werkzeug PBKDF2:SHA256 with salt
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat()
        }


class Document(db.Model):
    __tablename__ = 'documents'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False, unique=True)
    file_size = db.Column(db.Integer, nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False, default='Other')
    description = db.Column(db.Text, default='')
    owner_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    permissions = db.relationship('Permission', backref='document', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, user=None):
        data = {
            'id': self.id,
            'title': self.title,
            'originalFilename': self.original_filename,
            'storedFilename': self.stored_filename,
            'fileSize': self.file_size,
            'mimeType': self.mime_type,
            'category': self.category,
            'description': self.description,
            'ownerId': self.owner_id,
            'ownerEmail': self.owner.email if self.owner else None,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
            'sharedCount': len(self.permissions)
        }
        if user:
            if user.id == self.owner_id:
                data['userPermission'] = 'OWNER'
            elif user.role == 'admin':
                data['userPermission'] = 'ADMIN'
            else:
                grant = next((p for p in self.permissions if p.user_id == user.id), None)
                data['userPermission'] = grant.permission_level if grant else None
        return data


class Permission(db.Model):
    __tablename__ = 'permissions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = db.Column(db.String(36), db.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    permission_level = db.Column(db.String(10), nullable=False) # VIEW, EDIT
    granted_by_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    granted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    granter = db.relationship('User', foreign_keys=[granted_by_id])

    __table_args__ = (
        db.UniqueConstraint('document_id', 'user_id', name='uq_doc_user_permission'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'documentId': self.document_id,
            'userId': self.user_id,
            'userEmail': self.user.email if self.user else '',
            'userName': self.user.name if self.user else '',
            'permissionLevel': self.permission_level,
            'grantedById': self.granted_by_id,
            'grantedByEmail': self.granter.email if self.granter else '',
            'grantedAt': self.granted_at.isoformat()
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    actor_id = db.Column(db.String(36), nullable=False)
    actor_email = db.Column(db.String(255), nullable=False)
    action = db.Column(db.String(50), nullable=False, index=True)
    resource_type = db.Column(db.String(20), nullable=False)
    resource_id = db.Column(db.String(36), nullable=False)
    status = db.Column(db.String(20), nullable=False) # SUCCESS, DENIED, FAILED
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.String(255), default='')
    details = db.Column(db.Text, default='')

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'actorId': self.actor_id,
            'actorEmail': self.actor_email,
            'action': self.action,
            'resourceType': self.resource_type,
            'resourceId': self.resource_id,
            'status': self.status,
            'ipAddress': self.ip_address,
            'userAgent': self.user_agent,
            'details': self.details
        }
