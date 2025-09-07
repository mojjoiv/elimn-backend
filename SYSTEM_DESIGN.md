# System Design

## Overview
This project implements a simple e-commerce order and payment system with authentication, authorization, idempotent order creation, payment integration (M-Pesa STK Push), and an admin dashboard.

## Backend (Node.js + Express + PostgreSQL)
- Authentication with JWT (register, login)
- RBAC (roles: user, admin)
- Orders API (idempotent order creation, stock locking)
- Payments API (M-Pesa STK Push, callback handling)
- LRU Cache for order lookups
- Database schema includes users, roles, products, orders, order_items, payments, payment_events, idempotency_keys

## Frontend (React + Vite + MUI)
- Login page (JWT auth)
- Dashboard with navigation
- Orders page for admins
- Uses Axios for API requests

## Payment Flow
- User creates an order
- User initiates payment (STK Push to M-Pesa)
- Callback from M-Pesa updates order status
- Admin dashboard shows updated orders
