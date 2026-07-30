package com.ideaspark.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Channel ID must match the <meta-data> value in AndroidManifest.xml
    // (com.google.firebase.messaging.default_notification_channel_id).
    // Without this channel, FCM notifications silently fail on Android 8+
    // because the OS requires all notifications to be posted to a channel.
    private static final String CHANNEL_ID = "socreate_default";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "SoCreate Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Likes, follows, comments, messages, and other activity");
            channel.enableVibration(true);
            channel.setShowBadge(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}