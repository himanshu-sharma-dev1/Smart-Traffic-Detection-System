# Stage 1: Build the React application
FROM node:18-alpine as build

# Set the working directory
WORKDIR /app

# Define build-time variable
ARG REACT_APP_API_BASE_URL

# Set the environment variable for the build process
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# Copy package.json and package-lock.json
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application for production
# The build process will use REACT_APP_API_BASE_URL
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:stable-alpine

# Copy the build output from the build stage to Nginx's web root
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# When the container starts, Nginx will automatically serve the static files.
CMD ["nginx", "-g", "daemon off;"]
