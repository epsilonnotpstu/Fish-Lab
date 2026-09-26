package org.aalabfst.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

/**
 * Member app for the Advanced Analytical Lab. It shows the lab's own member
 * portal; the only native behaviour we add is a sensible hardware back button.
 */
public class MainActivity extends BridgeActivity {

    private static final String SITE = "https://aalabfst.org";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleAuthHandoff(getIntent());

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

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAuthHandoff(intent);
    }

    /**
     * After signing in with Google in the system browser, the site redirects to
     * aalabapp://auth?t=<one-time token>. Exchange it for a session inside the
     * app's own web view.
     */
    private void handleAuthHandoff(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri data = intent.getData();
        if (!"aalabapp".equals(data.getScheme()) || !"auth".equals(data.getHost())) return;
        String token = data.getQueryParameter("t");
        if (token == null || token.isEmpty()) return;

        String url = SITE + "/api/auth/handoff?t=" + Uri.encode(token);
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.post(() -> webView.loadUrl(url));
        }
    }
}
