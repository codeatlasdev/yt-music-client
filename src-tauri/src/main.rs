#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};

const INNERTUBE_API_URL: &str = "https://music.youtube.com/youtubei/v1/player?prettyPrint=false";

async fn get_audio_stream_url(video_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();

    let body = json!({
        "videoId": video_id,
        "context": {
            "client": {
                "clientName": "IOS",
                "clientVersion": "19.29.1",
                "hl": "en",
                "gl": "US",
                "deviceMake": "Apple",
                "deviceModel": "iPhone16,2",
                "osName": "iPhone",
                "osVersion": "17.5.1"
            }
        }
    });

    let resp = client
        .post(INNERTUBE_API_URL)
        .header("Content-Type", "application/json")
        .header("User-Agent", "com.google.ios.youtubemusic/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)")
        .json(&body)
        .send()
        .await?
        .json::<Value>()
        .await?;

    // Find the best audio stream
    let formats = resp["streamingData"]["adaptiveFormats"]
        .as_array()
        .ok_or("No adaptive formats found")?;

    // Find audio-only stream with highest bitrate
    let audio_stream = formats
        .iter()
        .filter(|f| {
            f["mimeType"]
                .as_str()
                .map(|m| m.starts_with("audio/"))
                .unwrap_or(false)
        })
        .max_by_key(|f| f["bitrate"].as_u64().unwrap_or(0))
        .ok_or("No audio stream found")?;

    let url = audio_stream["url"]
        .as_str()
        .ok_or("No URL in audio stream")?;

    let bitrate = audio_stream["bitrate"].as_u64().unwrap_or(0);
    let mime = audio_stream["mimeType"].as_str().unwrap_or("unknown");

    println!("[Native Player] Found audio stream:");
    println!("  Bitrate: {} kbps", bitrate / 1000);
    println!("  Format: {}", mime);

    Ok(url.to_string())
}

#[tauri::command]
async fn play_track(video_id: String) -> Result<String, String> {
    match get_audio_stream_url(&video_id).await {
        Ok(url) => {
            println!("[Native Player] Stream URL obtained, playing via afplay...");
            // PoC: use macOS afplay to play the stream
            // In production this would use AVPlayer
            tokio::spawn(async move {
                let output = tokio::process::Command::new("afplay")
                    .arg(&url)
                    .output()
                    .await;
                match output {
                    Ok(o) => {
                        if !o.status.success() {
                            eprintln!("[Native Player] afplay error: {}", String::from_utf8_lossy(&o.stderr));
                        }
                    }
                    Err(e) => eprintln!("[Native Player] Failed to spawn afplay: {}", e),
                }
            });
            Ok("Playing".to_string())
        }
        Err(e) => Err(format!("Failed to get stream: {}", e)),
    }
}

#[tauri::command]
async fn search_track(query: String) -> Result<Value, String> {
    let client = reqwest::Client::new();

    let body = json!({
        "query": query,
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240101.01.00",
                "hl": "en",
                "gl": "US"
            }
        }
    });

    let resp = client
        .post("https://music.youtube.com/youtubei/v1/search?prettyPrint=false")
        .header("Content-Type", "application/json")
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<Value>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(resp)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![play_track, search_track])
        .setup(|app| {
            let _window = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("YT Music — Native Player PoC")
            .inner_size(400.0, 300.0)
            .center()
            .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
