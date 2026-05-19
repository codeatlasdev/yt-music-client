use souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, PlatformConfig};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Runtime};

static CONTROLS: Mutex<Option<MediaControls>> = Mutex::new(None);

pub fn init<R: Runtime>(handle: AppHandle<R>) {
    let config = PlatformConfig {
        dbus_name: "yt_music",
        display_name: "YouTube Music",
        hwnd: None,
    };

    if let Ok(mut controls) = MediaControls::new(config) {
        controls
            .attach(move |event: MediaControlEvent| {
                let action = match event {
                    MediaControlEvent::Play => "play",
                    MediaControlEvent::Pause => "pause",
                    MediaControlEvent::Toggle => "toggle",
                    MediaControlEvent::Next => "next",
                    MediaControlEvent::Previous => "previous",
                    _ => return,
                };
                handle.emit("media-control", action).ok();
            })
            .ok();
        *CONTROLS.lock().unwrap() = Some(controls);
    }
}

pub fn update(title: String, artist: String, is_playing: bool) {
    if let Some(controls) = CONTROLS.lock().unwrap().as_mut() {
        controls
            .set_metadata(MediaMetadata {
                title: Some(&title),
                artist: Some(&artist),
                ..Default::default()
            })
            .ok();
        controls
            .set_playback(if is_playing {
                MediaPlayback::Playing { progress: None }
            } else {
                MediaPlayback::Paused { progress: None }
            })
            .ok();
    }
}
