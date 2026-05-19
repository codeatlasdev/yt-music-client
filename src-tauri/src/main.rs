#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(deprecated)]

use tauri::{TitleBarStyle, WebviewUrl, WebviewWindowBuilder};
use tauri::webview::Color;

mod media;

const USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const INIT_SCRIPT: &str = include_str!("../scripts/init.js");
const OPTIMIZE_SCRIPT: &str = include_str!("../scripts/optimize.js");
const PLUGINS_SCRIPT: &str = include_str!("../scripts/plugins.js");

#[cfg(debug_assertions)]
const PERF_MONITOR: &str = include_str!("../scripts/perf-monitor.js");

const AD_DOMAINS: &[&str] = &[
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "youtube.com/pagead",
    "youtube.com/get_midroll",
    "googleads.g.doubleclick.net",
    "static.doubleclick.net",
    "ad.youtube.com",
    "ads.youtube.com",
    "pagead2.googlesyndication.com",
];

const ALLOWED_DOMAINS: &[&str] = &[
    "music.youtube.com",
    "www.youtube.com",
    "youtube.com",
    "accounts.google.com",
    "accounts.youtube.com",
    "consent.youtube.com",
    "consent.google.com",
    "myaccount.google.com",
    "www.google.com",
    "www.gstatic.com",
    "gstatic.com",
    "googlevideo.com",
    "googleapis.com",
    "googleusercontent.com",
    "ytimg.com",
    "ggpht.com",
    "youtube-nocookie.com",
];

fn is_ad_url(url: &str) -> bool {
    AD_DOMAINS.iter().any(|domain| url.contains(domain))
}

fn is_allowed_url(url: &str) -> bool {
    ALLOWED_DOMAINS.iter().any(|domain| url.contains(domain))
}

#[tauri::command]
fn update_media(title: String, artist: String, is_playing: bool) {
    media::update(title, artist, is_playing);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![update_media])
        .setup(|app| {
            let handle = app.handle().clone();

            let window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("https://music.youtube.com".parse().unwrap()),
            )
            .title("YouTube Music")
            .inner_size(1280.0, 800.0)
            .min_inner_size(600.0, 400.0)
            .center()
            .hidden_title(true)
            .title_bar_style(TitleBarStyle::Transparent)
            .background_color(Color(3, 3, 3, 255))
            .visible(false)
            .user_agent(USER_AGENT)
            .initialization_script(INIT_SCRIPT)
            .initialization_script(OPTIMIZE_SCRIPT)
            .initialization_script(PLUGINS_SCRIPT)
            .on_navigation(|url| {
                let s = url.as_str();
                !is_ad_url(s)
            })
            .build()?;

            // Set native dark background color (#030303) via cocoa
            use cocoa::appkit::{NSColor, NSWindow};
            use cocoa::base::{id, nil};

            let ns_window = window.ns_window().unwrap() as id;
            unsafe {
                let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                    nil,
                    3.0 / 255.0,
                    3.0 / 255.0,
                    3.0 / 255.0,
                    1.0,
                );
                ns_window.setBackgroundColor_(bg_color);
            }

            media::init(handle);

            // Debug: inject performance monitor
            #[cfg(debug_assertions)]
            {
                let w = window.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    w.eval(PERF_MONITOR).ok();
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
