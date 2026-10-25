import sys
import argparse
from .app import create_app
from .models import db, User, AuditLog

def create_admin():
    parser = argparse.ArgumentParser(description="Secure TrustVault Administrator Provisioning")
    parser.add_argument("--email", required=True, help="Administrator email address")
    parser.add_argument("--password", required=True, help="Strong administrator password (>= 8 chars)")
    parser.add_argument("--name", default="System Administrator", help="Administrator display name")

    args = parser.parse_args()

    if len(args.password) < 8:
        print("[-] Error: Administrator password must be at least 8 characters long.")
        sys.exit(1)

    app = create_app()
    with app.app_context():
        existing = User.query.filter_by(email=args.email.strip().lower()).first()
        if existing:
            print(f"[-] Error: User with email '{args.email}' already exists. Updating role to 'admin'...")
            existing.role = 'admin'
            existing.set_password(args.password)
            existing.is_active = True
            db.session.commit()
            print(f"[+] Administrator credentials updated for {args.email}")
            return

        admin = User(
            email=args.email.strip().lower(),
            name=args.name,
            role='admin',
            is_active=True
        )
        admin.set_password(args.password)
        db.session.add(admin)
        db.session.commit()

        log = AuditLog(
            actor_id=admin.id,
            actor_email=admin.email,
            action='ADMIN_PROVISION',
            resource_type='USER',
            resource_id=admin.id,
            status='SUCCESS',
            ip_address='127.0.0.1',
            details='Administrator provisioned securely via CLI tool'
        )
        db.session.add(log)
        db.session.commit()

        print(f"[+] Administrator account successfully provisioned: {admin.email} (ID: {admin.id})")

if __name__ == '__main__':
    create_admin()
