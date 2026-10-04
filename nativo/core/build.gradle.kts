// Reglas del juego en Kotlin puro (sin Android): se prueban en la PC con `gradlew :core:test`
plugins {
    id("org.jetbrains.kotlin.jvm")
    id("org.jetbrains.kotlin.plugin.serialization")
}
java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}
kotlin {
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    testImplementation(kotlin("test"))
}
tasks.test {
    useJUnitPlatform()
    // la comparación cruzada con el motor JS lee este archivo (lo genera `node tools/crosscheck-combat.js`)
    inputs.files(layout.buildDirectory.file("crosscheck.txt")).optional()
    testLogging { showStandardStreams = true }
}
