"""Add configurable packages and optional guest guidance.

Revision ID: b832a4901f01
Revises: 4acbfa2e7f23
"""

from alembic import op
import sqlalchemy as sa

revision = "b832a4901f01"
down_revision = "4acbfa2e7f23"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "business_settings",
        sa.Column("snack_min_per_guest", sa.Numeric(6, 2), nullable=True),
    )
    op.add_column(
        "business_settings",
        sa.Column("snack_max_per_guest", sa.Numeric(6, 2), nullable=True),
    )
    op.create_check_constraint(
        op.f("ck_business_settings_snack_guest_range_valid"),
        "business_settings",
        "(snack_min_per_guest IS NULL AND snack_max_per_guest IS NULL) OR (snack_min_per_guest IS NOT NULL AND snack_max_per_guest IS NOT NULL AND snack_min_per_guest > 0 AND snack_max_per_guest >= snack_min_per_guest)",
    )
    op.create_table(
        "snack_packages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("items", sa.JSON(), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_snack_packages")),
    )


def downgrade():
    op.drop_table("snack_packages")
    op.drop_constraint(
        op.f("ck_business_settings_snack_guest_range_valid"),
        "business_settings",
        type_="check",
    )
    op.drop_column("business_settings", "snack_max_per_guest")
    op.drop_column("business_settings", "snack_min_per_guest")
