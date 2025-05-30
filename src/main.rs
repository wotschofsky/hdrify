use std::collections::HashMap;
use std::process::Command;
use warp::Filter;
use serde::{Serialize};
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Serialize)]
struct ProcessResponse {
    success: bool,
    message: String,
    image_data: Option<String>, // base64 encoded HDR image
}

async fn handle_upload(form: HashMap<String, String>) -> Result<impl warp::Reply, warp::Rejection> {
    let image_data = form.get("image").unwrap_or(&String::new()).clone();
    let hdr_value: f32 = form.get("hdr_value")
        .and_then(|v| v.parse().ok())
        .unwrap_or(1.5);

    println!("Processing image with HDR value: {}", hdr_value);

    // Validate input
    if image_data.is_empty() {
        return Ok(warp::reply::json(&ProcessResponse {
            success: false,
            message: "No image data provided".to_string(),
            image_data: None,
        }));
    }

    // Decode base64 image
    let image_bytes = match general_purpose::STANDARD.decode(&image_data) {
        Ok(bytes) => bytes,
        Err(e) => {
            return Ok(warp::reply::json(&ProcessResponse {
                success: false,
                message: format!("Failed to decode image: {}", e),
                image_data: None,
            }));
        }
    };

    // Validate file size (10MB max)
    const MAX_SIZE: usize = 10 * 1024 * 1024; // 10MB
    if image_bytes.len() > MAX_SIZE {
        return Ok(warp::reply::json(&ProcessResponse {
            success: false,
            message: format!("File too large: {:.1}MB. Maximum size is 10MB.",
                image_bytes.len() as f64 / 1024.0 / 1024.0),
            image_data: None,
        }));
    }

    // Basic image format validation by checking magic bytes
    if !is_supported_image_format(&image_bytes) {
        return Ok(warp::reply::json(&ProcessResponse {
            success: false,
            message: "Unsupported image format. Please upload JPEG, PNG, or WebP images.".to_string(),
            image_data: None,
        }));
    }

    // Create temporary files
    let input_file = tempfile::NamedTempFile::new().unwrap();
    let output_file = tempfile::NamedTempFile::new().unwrap();

    // Write input image to temp file
    std::fs::write(input_file.path(), &image_bytes).unwrap();

    // Run ImageMagick command based on the article
    let output = Command::new("magick")
        .arg(input_file.path())
        .arg("-define")
        .arg("quantum:format=floating-point")
        .arg("-colorspace")
        .arg("RGB")
        .arg("-auto-gamma")
        .arg("-evaluate")
        .arg("Multiply")
        .arg(hdr_value.to_string())
        .arg("-evaluate")
        .arg("Pow")
        .arg("0.9")
        .arg("-colorspace")
        .arg("sRGB")
        .arg("-depth")
        .arg("16")
        .arg("-profile")
        .arg("2020_profile.icc")
        .arg(output_file.path())
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                // Read the processed image
                match std::fs::read(output_file.path()) {
                    Ok(processed_bytes) => {
                        let encoded = general_purpose::STANDARD.encode(&processed_bytes);
                        Ok(warp::reply::json(&ProcessResponse {
                            success: true,
                            message: "Image processed successfully".to_string(),
                            image_data: Some(encoded),
                        }))
                    }
                    Err(e) => {
                        Ok(warp::reply::json(&ProcessResponse {
                            success: false,
                            message: format!("Failed to read processed image: {}", e),
                            image_data: None,
                        }))
                    }
                }
            } else {
                let error_msg = String::from_utf8_lossy(&output.stderr);
                Ok(warp::reply::json(&ProcessResponse {
                    success: false,
                    message: format!("ImageMagick error: {}", error_msg),
                    image_data: None,
                }))
            }
        }
        Err(e) => {
            Ok(warp::reply::json(&ProcessResponse {
                success: false,
                message: format!("Failed to execute ImageMagick: {}", e),
                image_data: None,
            }))
        }
    }
}

fn is_supported_image_format(bytes: &[u8]) -> bool {
    if bytes.len() < 12 {
        return false;
    }

    // Check magic bytes for supported formats
    // JPEG: FF D8 FF
    if bytes.len() >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF {
        return true;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if bytes.len() >= 8 && bytes[0..8] == [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] {
        return true;
    }

    // WebP: starts with "RIFF" and contains "WEBP"
    if bytes.len() >= 12
        && bytes[0..4] == [0x52, 0x49, 0x46, 0x46] // "RIFF"
        && bytes[8..12] == [0x57, 0x45, 0x42, 0x50] // "WEBP"
    {
        return true;
    }

    false
}

#[tokio::main]
async fn main() {
    // Serve static files
    let static_files = warp::fs::dir("static");

    // Route for form upload (only endpoint)
    let upload = warp::path("upload")
        .and(warp::post())
        .and(warp::body::form())
        .and_then(handle_upload);

    // Root route serves index.html
    let index = warp::path::end()
        .and(warp::fs::file("static/index.html"));

    let routes = index
        .or(static_files)
        .or(upload)
        .with(warp::cors().allow_any_origin());

    println!("Server starting on http://localhost:3000");
    warp::serve(routes)
        .run(([0, 0, 0, 0], 3000))
        .await;
}
