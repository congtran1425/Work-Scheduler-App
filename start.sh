#!/bin/bash

echo "========================================"
echo "   Work Scheduler - Starting Application"
echo "========================================"
echo

echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js found: $(node --version)"

echo
echo "Checking if dependencies are installed..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
fi

echo
echo "Checking database..."
if [ ! -f "database.sqlite" ]; then
    echo "Initializing database..."
    npm run init-db
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to initialize database"
        exit 1
    fi
fi

echo
echo "Starting server..."
echo "Application will be available at: http://localhost:3000"
echo
echo "Press Ctrl+C to stop the server"
echo "========================================"
echo

npm start
