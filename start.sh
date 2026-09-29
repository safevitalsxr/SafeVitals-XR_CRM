#!/bin/bash

cd /home/my-app/backend

pm2 start npm --name "my-app-backend" -- run start:prod
pm2 save
