plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.skidmarks.app"
    compileSdk = 36

    defaultConfig {
        // The same application ID as the phone app. The Wear OS Data Layer
        // sends data only between apps with the same ID and the same key.
        applicationId = "com.skidmarks.app"
        minSdk = 30
        targetSdk = 36
        versionCode = (System.getenv("WEAR_VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("WEAR_VERSION_NAME") ?: "2.0.0"
    }

    signingConfigs {
        // The fixed test key in ../signing (public, test builds only).
        // The phone app uses the same key.
        getByName("debug") {
            storeFile = rootProject.file("../signing/debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }
}

kotlin {
    jvmToolchain(21)
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

// Versions: the newest that work with Android Gradle plugin 8.13 and compile SDK 36
// (the same tool chain as the phone app). Newer Compose (1.12+) and core (1.19+)
// need compile SDK 37 and Android Gradle plugin 9.
dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.06.01")
    implementation(composeBom)
    implementation("androidx.core:core-ktx:1.18.0")
    implementation("androidx.activity:activity-compose:1.12.4")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.wear.compose:compose-material:1.5.6")
    implementation("androidx.wear.compose:compose-foundation:1.5.6")
    implementation("androidx.wear.compose:compose-navigation:1.5.6")
    implementation("androidx.wear:wear:1.3.0")
    implementation("androidx.health:health-services-client:1.1.0")
    // Health Services returns ListenableFuture (Guava).
    implementation("com.google.guava:guava:33.3.1-android")
    implementation("androidx.wear:wear-ongoing:1.1.0")
    implementation("androidx.concurrent:concurrent-futures-ktx:1.3.0")
    implementation("com.google.android.gms:play-services-wearable:20.0.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.10.2")

    testImplementation("junit:junit:4.13.2")
    // The real org.json for JVM tests (Android gives only stubs there).
    testImplementation("org.json:json:20250517")
}
