"""Reusable role-based permission classes.

This module centralizes checks for CRM roles and their capability flags so
endpoints can declare the required role or capability via DRF permissions.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import CRMRole, ROLE_ADMIN, ROLE_CURATOR, ROLE_PROJECTANT


class RolePermission(BasePermission):
    """Base permission that checks roles for read and write actions."""

    safe_roles: tuple[str, ...] = ()
    write_roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        allowed_roles = self.safe_roles if request.method in SAFE_METHODS else self.write_roles
        if not allowed_roles:
            return False

        return CRMRole.objects.filter(user=user, role_type__in=allowed_roles).exists()


class AdminOnlyPermission(RolePermission):
    """Allow access to users with the admin CRM role."""

    safe_roles = write_roles = (ROLE_ADMIN,)


class CuratorOnlyPermission(RolePermission):
    """Allow access to users with the curator CRM role."""

    safe_roles = write_roles = (ROLE_CURATOR,)


class ProjectantOnlyPermission(RolePermission):
    """Allow access to users with the projectant CRM role."""

    safe_roles = write_roles = (ROLE_PROJECTANT,)


class CuratorOrAdminPermission(RolePermission):
    """Allow access to users who are curators or admins."""

    safe_roles = write_roles = (ROLE_CURATOR, ROLE_ADMIN)


class ProjectantReadCuratorAdminWritePermission(RolePermission):
    """Allow projectants to read and curators/admins to manage resources."""

    safe_roles = (ROLE_PROJECTANT, ROLE_CURATOR, ROLE_ADMIN)
    write_roles = (ROLE_CURATOR, ROLE_ADMIN)
