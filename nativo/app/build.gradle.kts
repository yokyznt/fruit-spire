plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("io.github.takahirom.roborazzi")
}

android {
    namespace = "com.yokyznt.fruitspire.nativo"
    compileSdk = 36

    defaultConfig {
        // app aparte mientras se construye; al final pasa a ser com.yokyznt.fruitspire
        applicationId = "com.yokyznt.fruitspire.nativo"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "3.0-etapa1"
    }
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures { compose = true }
    // las capturas de pantalla se hacen en la PC con Robolectric (ver ScreenshotTest)
    testOptions { unitTests { isIncludeAndroidResources = true } }
    // los dibujos y el sonido ya vienen comprimidos (webp/ogg): no se vuelven a comprimir
    androidResources { noCompress += listOf("webp", "ogg") }
}
kotlin {
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}
// La partida (`Run`) es un objeto mutable que Compose no observa: las pantallas se redibujan porque `GameViewModel.tick` sube.
// Con «strong skipping» (el valor por defecto desde Kotlin 2.0.20) una pantalla que recibe la misma instancia de `Run` se salta
// al recomponer y se queda con lo viejo (el premio recogido seguía por recoger), así que se desactiva.
composeCompiler {
    featureFlags = setOf(org.jetbrains.kotlin.compose.compiler.gradle.ComposeFeatureFlag.StrongSkipping.disabled())
}

dependencies {
    implementation(project(":core"))
    implementation(platform("androidx.compose:compose-bom:2025.08.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.animation:animation")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.2")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.2")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.15.1")
    testImplementation("androidx.test:core:1.6.1")
    testImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    testImplementation("io.github.takahirom.roborazzi:roborazzi:1.46.1")
    testImplementation("io.github.takahirom.roborazzi:roborazzi-compose:1.46.1")
}
