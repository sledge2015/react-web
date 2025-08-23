#!/bin/bash

# 脚本名称: start_service.sh
# 作用: 启动生产级 FastAPI 应用
#
# 使用方法:
#   开发环境: ./start_service.sh dev
#   生产环境: ./start_service.sh prod

set -e  # 遇到错误立即退出

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 切换到项目根目录
cd "$PROJECT_ROOT"

# 检查环境参数
ENVIRONMENT=${1:-dev}

echo "🚀 Starting FastAPI application in $ENVIRONMENT mode..."

# 激活虚拟环境（如果存在）
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
fi

# 检查依赖
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt not found!"
    exit 1
fi

# 安装依赖（开发环境）
if [ "$ENVIRONMENT" = "dev" ]; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
fi

# 设置 Python 路径
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH}"

# 根据环境启动应用
case $ENVIRONMENT in
    "dev")
        echo "🔧 Starting development server..."
        uvicorn app.main:app \
            --reload \
            --host 0.0.0.0 \
            --port 8000 \
            --log-level info
        ;;
    "prod")
        echo "🏭 Starting production server..."
        uvicorn app.main:app \
            --host 0.0.0.0 \
            --port 8000 \
            --workers 4 \
            --log-level warning \
            --access-log
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        echo "Usage: $0 [dev|prod]"
        exit 1
        ;;
esac