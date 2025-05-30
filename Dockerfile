# Build stage
FROM alpine:3 AS builder

# Install build dependencies
RUN apk add --no-cache \
    curl \
    build-base \
    musl-dev

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy project files
COPY Cargo.toml Cargo.lock ./
COPY src ./src

# Build the application
RUN cargo build --release

# Production stage
FROM alpine:3

# Install only runtime dependencies
RUN apk add --no-cache \
    imagemagick \
    libjpeg-turbo \
    libpng \
    libwebp \
    libwebp-tools

# Set working directory
WORKDIR /app

# Copy built binary from build stage
COPY --from=builder /app/target/release/hdrify ./

# Copy static files and color profile
COPY static ./static
COPY 2020_profile.icc ./

# Expose port
EXPOSE 3000

# Run the application
CMD ["./hdrify"]
