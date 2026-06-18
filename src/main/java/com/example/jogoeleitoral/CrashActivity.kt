package com.example.jogoeleitoral

import android.app.Activity
import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView

class CrashActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val crashLog = intent.getStringExtra("crash") ?: "Unknown crash"
        
        val scrollView = ScrollView(this)
        val textView = TextView(this).apply {
            text = "App Crashed:\n\n$crashLog"
            setPadding(32, 32, 32, 32)
            textSize = 12f
            setTextColor(android.graphics.Color.RED)
        }
        
        scrollView.addView(textView)
        setContentView(scrollView)
    }
}
