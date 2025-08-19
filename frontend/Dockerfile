# Stage 1: Build the React application
FROM node:16-alpine as build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . ./

# Build the application
RUN npm run build

# Stage 2: Serve the application from a lightweight server
FROM node:16-alpine

# Install `serve` to run the static site
RUN npm install -g serve

# Set the working directory
WORKDIR /app

# Copy the build output from the build stage
COPY --from=build /app/build .

# Expose port 3000
EXPOSE 3000

# Command to serve the app
CMD ["serve", "-s", ".", "-l", "3000"]
