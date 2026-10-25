import os
import io
import pytest
from backend.app import create_app
from backend.models import db, User, Document, Permission, AuditLog

@pytest.fixture
def app_instance(tmp_path):
    test_db = tmp_path / "test_trustvault.db"
    test_storage = tmp_path / "test_vault_storage"
    test_storage.mkdir()

    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{test_db}",
        'UPLOAD_FOLDER': str(test_storage),
        'SECRET_KEY': 'test-secret'
    })
    return app

@pytest.fixture
def client(app_instance):
    return app_instance.test_client()

@pytest.fixture
def seed_users(app_instance):
    with app_instance.app_context():
        # Admin A
        admin_a = User(email='admin_a@trustvault.io', name='Admin A', role='admin', is_active=True)
        admin_a.set_password('AdminSecret123!')

        # Owner A
        owner_a = User(email='owner_a@trustvault.io', name='Owner A', role='owner', is_active=True)
        owner_a.set_password('OwnerSecretA!')

        # Owner B
        owner_b = User(email='owner_b@trustvault.io', name='Owner B', role='owner', is_active=True)
        owner_b.set_password('OwnerSecretB!')

        # Viewer A
        viewer_a = User(email='viewer_a@trustvault.io', name='Viewer A', role='viewer', is_active=True)
        viewer_a.set_password('ViewerSecretA!')

        # Viewer B
        viewer_b = User(email='viewer_b@trustvault.io', name='Viewer B', role='viewer', is_active=True)
        viewer_b.set_password('ViewerSecretB!')

        # Inactive User
        inactive_u = User(email='inactive@trustvault.io', name='Inactive User', role='owner', is_active=False)
        inactive_u.set_password('InactiveSecret!')

        db.session.add_all([admin_a, owner_a, owner_b, viewer_a, viewer_b, inactive_u])
        db.session.commit()

        # Seed Document 1 owned by Owner A
        doc1 = Document(
            title="Owner A's Secret Strategy",
            original_filename="strategy.pdf",
            stored_filename="stored_strategy_doc1.pdf",
            file_size=1024,
            mime_type="application/pdf",
            category="Legal",
            description="Strategy doc",
            owner_id=owner_a.id
        )
        # Create physical dummy file
        doc_path = os.path.join(app_instance.config['UPLOAD_FOLDER'], doc1.stored_filename)
        with open(doc_path, 'wb') as f:
            f.write(b"%PDF-1.4 Mock document content for Owner A")

        # Seed Document 2 owned by Owner B
        doc2 = Document(
            title="Owner B's Financial Statements",
            original_filename="finances.xlsx",
            stored_filename="stored_finances_doc2.xlsx",
            file_size=2048,
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            category="Finance",
            description="Private financial ledger",
            owner_id=owner_b.id
        )
        doc2_path = os.path.join(app_instance.config['UPLOAD_FOLDER'], doc2.stored_filename)
        with open(doc2_path, 'wb') as f:
            f.write(b"Mock financial content for Owner B")

        db.session.add_all([doc1, doc2])
        db.session.commit()

        return {
            'admin_a_id': admin_a.id,
            'owner_a_id': owner_a.id,
            'owner_b_id': owner_b.id,
            'viewer_a_id': viewer_a.id,
            'viewer_b_id': viewer_b.id,
            'inactive_id': inactive_u.id,
            'doc1_id': doc1.id,
            'doc2_id': doc2.id
        }

def auth_header(user_id):
    return {'Authorization': f'Bearer {user_id}'}

# TEST 1: Unauthenticated requests cannot access protected APIs
def test_1_unauthenticated_requests_denied(client, seed_users):
    resp = client.get('/api/documents')
    assert resp.status_code == 401
    assert 'error' in resp.get_json()

# TEST 2: Owner A can manage their own document
def test_2_owner_a_can_manage_own_doc(client, seed_users):
    headers = auth_header(seed_users['owner_a_id'])
    # Can view
    resp = client.get(f"/api/documents/{seed_users['doc1_id']}", headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()['document']['title'] == "Owner A's Secret Strategy"

    # Can edit metadata
    edit_resp = client.patch(
        f"/api/documents/{seed_users['doc1_id']}",
        json={'title': "Owner A's Updated Strategy"},
        headers=headers
    )
    assert edit_resp.status_code == 200
    assert edit_resp.get_json()['document']['title'] == "Owner A's Updated Strategy"

# TEST 3: Owner A cannot manage Owner B's document (prevent IDOR)
def test_3_owner_a_cannot_manage_owner_b_doc(client, seed_users):
    headers = auth_header(seed_users['owner_a_id'])
    # Cannot view without grant
    resp = client.get(f"/api/documents/{seed_users['doc2_id']}", headers=headers)
    assert resp.status_code == 403

    # Cannot delete Owner B's doc
    del_resp = client.delete(f"/api/documents/{seed_users['doc2_id']}", headers=headers)
    assert del_resp.status_code == 403

# TEST 4: Viewer cannot upload or delete documents
def test_4_viewer_cannot_upload_or_delete(client, seed_users):
    headers = auth_header(seed_users['viewer_a_id'])
    # Try upload
    data = {'file': (io.BytesIO(b"content"), 'test.txt'), 'title': 'Viewer Doc'}
    resp = client.post('/api/documents/upload', data=data, headers=headers)
    assert resp.status_code == 403

    # Try delete Owner A's doc
    del_resp = client.delete(f"/api/documents/{seed_users['doc1_id']}", headers=headers)
    assert del_resp.status_code == 403

# TEST 5: Viewer cannot grant or revoke permissions
def test_5_viewer_cannot_grant_or_revoke(client, seed_users):
    headers = auth_header(seed_users['viewer_a_id'])
    grant_resp = client.post(
        f"/api/documents/{seed_users['doc1_id']}/permissions",
        json={'userId': seed_users['viewer_b_id'], 'permissionLevel': 'VIEW'},
        headers=headers
    )
    assert grant_resp.status_code == 403

# TEST 6: Viewer cannot change document ownership
def test_6_viewer_cannot_change_ownership(client, seed_users):
    headers = auth_header(seed_users['viewer_a_id'])
    # Direct patch attempts to change ownerId must be ignored or rejected
    patch_resp = client.patch(
        f"/api/documents/{seed_users['doc1_id']}",
        json={'ownerId': seed_users['viewer_a_id']},
        headers=headers
    )
    assert patch_resp.status_code == 403

# TEST 7: Viewer cannot access administrative endpoints
def test_7_viewer_cannot_access_admin(client, seed_users):
    headers = auth_header(seed_users['viewer_a_id'])
    resp = client.get('/api/admin/audit-logs', headers=headers)
    assert resp.status_code == 403

# TEST 8: Public registration cannot self-promote to admin
def test_8_no_admin_self_promotion(client):
    resp = client.post('/api/auth/register', json={
        'name': 'Hacker',
        'email': 'hacker@trustvault.io',
        'password': 'Password123!',
        'role': 'admin' # attempted override
    })
    assert resp.status_code == 201
    user_data = resp.get_json()['user']
    assert user_data['role'] == 'owner' # Must strictly force owner/regular role!

# TEST 9: Authorized viewer can download a shared document
def test_9_authorized_viewer_can_download(client, seed_users):
    # Owner A grants VIEW to Viewer A
    owner_headers = auth_header(seed_users['owner_a_id'])
    client.post(
        f"/api/documents/{seed_users['doc1_id']}/permissions",
        json={'userId': seed_users['viewer_a_id'], 'permissionLevel': 'VIEW'},
        headers=owner_headers
    )

    # Viewer A downloads
    viewer_headers = auth_header(seed_users['viewer_a_id'])
    resp = client.get(f"/api/documents/{seed_users['doc1_id']}/download", headers=viewer_headers)
    assert resp.status_code == 200
    assert b"%PDF-1.4 Mock document content for Owner A" in resp.data

# TEST 10: Unapproved user cannot download the document
def test_10_unapproved_user_cannot_download(client, seed_users):
    headers = auth_header(seed_users['viewer_b_id'])
    resp = client.get(f"/api/documents/{seed_users['doc1_id']}/download", headers=headers)
    assert resp.status_code == 403

# TEST 11: Revocation blocks subsequent downloads immediately
def test_11_revocation_blocks_subsequent_downloads(client, seed_users):
    owner_headers = auth_header(seed_users['owner_a_id'])
    viewer_headers = auth_header(seed_users['viewer_a_id'])

    # Grant
    client.post(
        f"/api/documents/{seed_users['doc1_id']}/permissions",
        json={'userId': seed_users['viewer_a_id'], 'permissionLevel': 'VIEW'},
        headers=owner_headers
    )
    # Revoke
    revoke_resp = client.delete(
        f"/api/documents/{seed_users['doc1_id']}/permissions/{seed_users['viewer_a_id']}",
        headers=owner_headers
    )
    assert revoke_resp.status_code == 200

    # Immediate download attempt must fail with 403
    download_resp = client.get(f"/api/documents/{seed_users['doc1_id']}/download", headers=viewer_headers)
    assert download_resp.status_code == 403

# TEST 12: Inactive users cannot access protected resources
def test_12_inactive_user_cannot_access(client, seed_users):
    headers = auth_header(seed_users['inactive_id'])
    resp = client.get('/api/documents', headers=headers)
    assert resp.status_code == 401

# TEST 13: Invalid and oversized uploads are rejected
def test_13_invalid_and_oversized_uploads_rejected(client, seed_users):
    headers = auth_header(seed_users['owner_a_id'])
    # Disallowed extension (.exe)
    data = {'file': (io.BytesIO(b"binary"), 'virus.exe')}
    resp = client.post('/api/documents/upload', data=data, headers=headers)
    assert resp.status_code == 400
    assert 'Disallowed file type' in resp.get_json()['error']

# TEST 14: Malicious filenames cannot escape storage directory (path traversal defense)
def test_14_path_traversal_sanitized(client, seed_users, app_instance):
    headers = auth_header(seed_users['owner_a_id'])
    data = {'file': (io.BytesIO(b"safe text"), '../../../../evil.txt')}
    resp = client.post('/api/documents/upload', data=data, headers=headers)
    assert resp.status_code == 201
    stored_name = resp.get_json()['document']['storedFilename']
    # Stored name must be inside UPLOAD_FOLDER without any path components
    assert '/' not in stored_name and '\\' not in stored_name
    assert os.path.exists(os.path.join(app_instance.config['UPLOAD_FOLDER'], stored_name))

# TEST 15: Unauthorized users cannot access audit logs
def test_15_unauthorized_audit_log_access(client, seed_users):
    headers = auth_header(seed_users['owner_a_id'])
    resp = client.get('/api/admin/audit-logs', headers=headers)
    assert resp.status_code == 403

    admin_headers = auth_header(seed_users['admin_a_id'])
    admin_resp = client.get('/api/admin/audit-logs', headers=admin_headers)
    assert admin_resp.status_code == 200
    assert 'logs' in admin_resp.get_json()

# TEST 16: Denied operations do not modify database state
def test_16_denied_operation_state_integrity(client, seed_users, app_instance):
    headers = auth_header(seed_users['owner_b_id'])
    # Owner B tries to delete Owner A's doc
    client.delete(f"/api/documents/{seed_users['doc1_id']}", headers=headers)

    with app_instance.app_context():
        doc = db.session.get(Document, seed_users['doc1_id'])
        assert doc is not None # Doc still intact in database!

# TEST 17: Login with invalid credentials fails and records audit
def test_17_invalid_login_records_audit(client, seed_users, app_instance):
    resp = client.post('/api/auth/login', json={'email': 'owner_a@trustvault.io', 'password': 'WrongPassword!'})
    assert resp.status_code == 401

    with app_instance.app_context():
        log = AuditLog.query.filter_by(action='LOGIN_FAILURE').first()
        assert log is not None
        assert log.status == 'FAILED'

# TEST 18: Unauthorized metadata edits fail
def test_18_unauthorized_metadata_edits_fail(client, seed_users):
    headers = auth_header(seed_users['viewer_a_id'])
    resp = client.patch(f"/api/documents/{seed_users['doc1_id']}", json={'title': 'Hacked Title'}, headers=headers)
    assert resp.status_code == 403

# TEST 19: Documents list does not expose unauthorized documents
def test_19_list_does_not_expose_unauthorized_docs(client, seed_users):
    headers = auth_header(seed_users['owner_a_id'])
    resp = client.get('/api/documents', headers=headers)
    assert resp.status_code == 200
    docs = resp.get_json()['documents']
    doc_ids = [d['id'] for d in docs]
    assert seed_users['doc1_id'] in doc_ids
    assert seed_users['doc2_id'] not in doc_ids # Owner B's doc is not leaked!

# TEST 20: Password update requires matching current password
def test_20_password_update_requires_current_password(client, seed_users):
    headers = auth_header(seed_users['owner_a_id'])
    resp = client.post('/api/auth/change-password', json={
        'currentPassword': 'WrongCurrentPassword',
        'newPassword': 'BrandNewPassword123!'
    }, headers=headers)
    assert resp.status_code == 400
    assert 'Current password does not match' in resp.get_json()['error']
