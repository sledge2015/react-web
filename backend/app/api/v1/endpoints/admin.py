from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_admin_user
from app.schemas.user import UserOut, UserUpdate
from app.services.user_service import UserService
from app.models.user import User

router = APIRouter()


@router.get(
	"/users",
	response_model=List[UserOut],
	summary="获取用户列表",
	description="管理员获取所有用户列表（支持分页）"
	)
def list_users(
		skip: int = Query(0, ge=0, description="跳过的记录数"),
		limit: int = Query(100, ge=1, le=1000, description="返回的记录数"),
		db: Session = Depends(get_db),
		current_admin: User = Depends(get_admin_user)
		):
	"""
	获取用户列表端点（管理员权限）

	- **skip**: 跳过的记录数（用于分页）
	- **limit**: 返回的记录数（最大1000）
	"""
	users = UserService.get_users(db, skip=skip, limit=limit)
	return users


@router.get(
	"/users/{user_id}",
	response_model=UserOut,
	summary="获取用户详情",
	description="管理员根据用户ID获取用户详细信息"
	)
def get_user_detail(
		user_id: int,
		db: Session = Depends(get_db),
		current_admin: User = Depends(get_admin_user)
		):
	"""
	获取用户详情端点（管理员权限）

	- **user_id**: 用户ID
	"""
	user = UserService.get_user_by_id(db, user_id)
	if not user:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="User not found"
			)
	return user


@router.put(
	"/users/{user_id}",
	response_model=UserOut,
	summary="更新用户信息",
	description="管理员更新用户信息"
	)
def update_user(
		user_id: int,
		user_update: UserUpdate,
		db: Session = Depends(get_db),
		current_admin: User = Depends(get_admin_user)
		):
	"""
	更新用户信息端点（管理员权限）

	- **user_id**: 用户ID
	- **user_update**: 更新的用户信息
	"""
	user = UserService.update_user(db, user_id, user_update)
	if not user:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="User not found"
			)
	return user


@router.put(
	"/users/{user_id}/active",
	response_model=UserOut,
	summary="设置用户状态",
	description="管理员激活或禁用用户账户"
	)
def set_user_active_status(
		user_id: int,
		is_active: bool = Query(..., description="用户状态：true为激活，false为禁用"),
		db: Session = Depends(get_db),
		current_admin: User = Depends(get_admin_user)
		):
	"""
	设置用户激活状态端点（管理员权限）

	- **user_id**: 用户ID
	- **is_active**: 用户状态（true: 激活, false: 禁用）
	"""
	user = UserService.set_user_active(db, user_id, is_active)
	if not user:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="User not found"
			)
	return user


@router.delete(
	"/users/{user_id}",
	status_code=status.HTTP_204_NO_CONTENT,
	summary="删除用户",
	description="管理员删除用户账户"
	)
def delete_user(
		user_id: int,
		db: Session = Depends(get_db),
		current_admin: User = Depends(get_admin_user)
		):
	"""
	删除用户端点（管理员权限）

	- **user_id**: 要删除的用户ID
	"""
	success = UserService.delete_user(db, user_id)
	if not success:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="User not found"
			)
	return None