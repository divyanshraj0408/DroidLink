package dev.droidlink;

import android.app.PendingIntent;
import android.content.Intent;
import android.service.quicksettings.TileService;

/** Quick Settings tile: one tap sends the phone clipboard to the Mac. */
public class ClipTile extends TileService {
    @Override
    public void onClick() {
        Intent i = new Intent(this, SendActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivityAndCollapse(PendingIntent.getActivity(this, 0, i, PendingIntent.FLAG_IMMUTABLE));
    }
}
