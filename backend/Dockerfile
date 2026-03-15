FROM node:latest

# Set the working directory to /main/mewwme
WORKDIR /main/mewwme

# Set the NODE_PATH environment variable
ENV NODE_PATH=/usr/local/lib/node_modules

# Copy package.json and tsconfig.json to the working directory
COPY package.json .
COPY tsconfig.json .

# Install npm dependencies
RUN yarn install

# Copy the rest of the application code to the working directory
COPY . .

# Set labels for the Docker image
LABEL name="mewwme" version="10.0"

# Export the port used by the application
EXPOSE 3000

# Start the mewwme application
RUN yarn build:full
CMD ["yarn", "start:shard"]