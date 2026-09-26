package org.aalabfst.app;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

/**
 * Member app for the Advanced Analytical Lab. It shows the lab's own member
 * portal; the only native behaviour we add is a sensible hardware back button.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // Nothing left in history: leave the app instead of showing a blank page.
                    moveTaskToBack(true);
                }
            }
        });
    }
}
