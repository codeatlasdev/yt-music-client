use souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, PlatformConfig};
use std::sync::Mutex;

static CONTROLS: Mutex<Option<MediaControls>> = Mutex::new(None);

pub fn init() {
    let config = PlatformConfig {
        dbus_name: "yt_music",
        display_name: "YouTube Music",
        hwnd: None,
    };

    if let Ok(mut controls) = MediaControls::new(config) {
        controls
            .attach(|event: MediaControlEvent| {
                match event {
                    MediaControlEvent::Play => {}
                    MediaControlEvent::Pause => {}
                    MediaControlEvent::Next => {}
                    MediaControlEvent::Previous => {}
                    _ => {}
                }
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
