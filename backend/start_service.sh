#!/bin/bash

# 脚本名称: start_app.sh
# 作用: 使用 uvicorn 启动 Fast API 应用
#
# 参数:
#   --reload: 当代码发生变化时自动重启服务器
#   --host 0.0.0.0: 使应用在所有网络接口上可用，允许外部访问
#   --port 5000: 在 5000 端口上运行应用

uvicorn main:app --reload --host 0.0.0.0 --port 8000