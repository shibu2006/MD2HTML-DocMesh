#!/bin/bash

# MD2HTML DOCMesh - Start Development Server

echo "Starting MD2HTML DOCMesh development server..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Dependencies not found. Installing..."
    npm install
fi

# Start the development server
npm run dev
