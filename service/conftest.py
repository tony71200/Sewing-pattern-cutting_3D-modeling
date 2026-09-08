"""Cho phép chạy `pytest service` từ thư mục gốc của dự án.

Không có file này thì chỉ `cd service && pytest` mới chạy được, vì tape/anny_body/... nằm
ở service/ chứ không được cài vào site-packages.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
