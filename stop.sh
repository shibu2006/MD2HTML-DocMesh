#!/bin/bash

# MD2HTML DOCMesh - Stop Development Server

echo "Stopping MD2HTML DOCMesh development server..."

# Find and kill the Vite process
pkill -f "vite" && echo "Development server stopped successfully." || echo "No running development server found."
