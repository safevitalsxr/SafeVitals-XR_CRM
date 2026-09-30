#!/bin/bash

cd /home/my-app/backend

if pm2 describe my-app-backend >/dev/null 2>&1; then
    pm2 restart my-app-backend
else
    pm2 start npm --name "my-app-backend" -- run start:prod
fi

pm2 save
