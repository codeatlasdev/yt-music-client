#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::WebviewUrl;
use tauri::WebviewWindowBuilder;

mod media;

const USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const INIT_SCRIPT: &str = include_str!("../scripts/init.js");

const AD_DOMAINS: &[&str] = &[
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "youtube.com/api/stats/ads",
    "youtube.com/pagead",
    "youtube.com/get_midroll",
    "googleads.g.doubleclick.net",
    "static.doubleclick.net",
    "ad.youtube.com",
    "ads.youtube.com",
];

fn is_ad_url(url: &str) -> bool {
    AD_DOMAINS.iter().any(|domain| url.contains(domain))
}

#[tauri::command]
fn update_media(title: String, artist: String, is_playing: bool) {
    media::update(title, artist, is_playing);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![update_media])
        .setup(|app| {
            let window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("https://music.youtube.com".parse().unwrap()),
            )
            .title("YouTube Music")
            .inner_size(1280.0, 800.0)
            .min_inner_size(600.0, 400.0)
            .center()
            .user_agent(USER_AGENT)
            .initialization_script(INIT_SCRIPT)
            .on_navigation(|url| !is_ad_url(url.as_str()))
            .build()?;

            #[cfg(target_os = "macos")]
            {
                use tauri::TitleBarStyle;
                window.set_title_bar_style(TitleBarStyle::Overlay).ok();
            }

            media::init();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
