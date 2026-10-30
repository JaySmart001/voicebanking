// Root Gradle config, matching the shape `npx react-native init` generates
// for RN 0.74. Not buildable in this sandbox (no Android SDK / RN CLI
// codegen output here) - see mobile/README.md for how to actually run this.
buildscript {
    extra["kotlinVersion"] = "1.9.24"
    extra["buildToolsVersion"] = "34.0.0"
    extra["compileSdkVersion"] = 34
    extra["minSdkVersion"] = 24
    extra["targetSdkVersion"] = 34

    repositories {
        google()
        mavenCentral()
    }

    dependencies {
        classpath("com.android.tools.build:gradle:8.4.2")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${extra["kotlinVersion"]}")
        classpath("com.facebook.react:react-native-gradle-plugin")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
