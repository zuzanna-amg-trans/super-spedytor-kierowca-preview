plugins {
    id("com.android.application")
}

val uploadKeystorePath = providers.environmentVariable("SS_UPLOAD_KEYSTORE_PATH").orNull
val uploadStorePassword = providers.environmentVariable("SS_UPLOAD_STORE_PASSWORD").orNull
val uploadKeyAlias = providers.environmentVariable("SS_UPLOAD_KEY_ALIAS").orNull
val uploadKeyPassword = providers.environmentVariable("SS_UPLOAD_KEY_PASSWORD").orNull
val completeUploadSigningEnvironment = listOf(
    uploadKeystorePath,
    uploadStorePassword,
    uploadKeyAlias,
    uploadKeyPassword
).all { !it.isNullOrBlank() }

android {
    namespace = "eu.amgtrans.superspedytor.driver"
    compileSdk = 36

    defaultConfig {
        // Registered in Google Play Console on 2026-10-13 (Play app ID 4973607422769920448).
        applicationId = "eu.amgtrans.superspedytor.driver"
        minSdk = 28
        targetSdk = 36
        versionCode = 12
        versionName = "0.1.11-internal"

        buildConfigField("String", "APP_QUERY", "\"android=1&backend=1\"")
        buildConfigField("String", "BACKEND_BASE_URL", "\"https://tms.amg.eco/api/\"")
        buildConfigField("boolean", "DEMO_MODE", "false")

        testInstrumentationRunner = "android.test.InstrumentationTestRunner"
    }

    signingConfigs {
        if (completeUploadSigningEnvironment) {
            create("release") {
                storeFile = file(uploadKeystorePath!!)
                storePassword = uploadStorePassword
                keyAlias = uploadKeyAlias
                keyPassword = uploadKeyPassword
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        create("preview") {
            initWith(getByName("debug"))
            applicationIdSuffix = ".preview"
            versionNameSuffix = "-preview"
            isDebuggable = false
            signingConfig = signingConfigs.getByName("debug")
            matchingFallbacks += listOf("debug")
            buildConfigField("String", "APP_QUERY", "\"android=1&preview=1\"")
            buildConfigField("boolean", "DEMO_MODE", "true")
        }
        create("internal") {
            initWith(getByName("release"))
            isDebuggable = false
            signingConfig = signingConfigs.findByName("release")
            matchingFallbacks += listOf("release")
        }
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.findByName("release")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }

    sourceSets {
        getByName("main") {
            // Package the reviewed web prototype as the single visual source.
            assets.directories.clear()
            assets.directories.add("../../dist")
        }
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
}

val verifyReleaseReadiness = tasks.register("verifyReleaseReadiness") {
    group = "verification"
    description = "Blokuje przypadkowe wydanie demo jako produkcyjnej aplikacji."

    doLast {
        val blockers = mutableListOf<String>()
        val packageApproved = providers.gradleProperty("ss.packageApproved").orNull
        val backendIntegrated = providers.gradleProperty("ss.backendIntegrated").orNull
        val dataSafetyApproved = providers.gradleProperty("ss.dataSafetyApproved").orNull
        val privacyPolicyUrl = providers.gradleProperty("ss.privacyPolicyUrl").orNull

        if (packageApproved != "true") {
            blockers += "brak -Pss.packageApproved=true dla finalnego applicationId"
        }
        if (backendIntegrated != "true") {
            blockers += "brak -Pss.backendIntegrated=true po odbiorze integracji ze stagingiem"
        }
        if (dataSafetyApproved != "true") {
            blockers += "brak -Pss.dataSafetyApproved=true po zatwierdzeniu deklaracji Data safety"
        }
        if (privacyPolicyUrl.isNullOrBlank() || !privacyPolicyUrl.startsWith("https://")) {
            blockers += "brak publicznego adresu HTTPS w -Pss.privacyPolicyUrl"
        }

        val mainActivity = file(
            "src/main/java/eu/amgtrans/superspedytor/driver/MainActivity.java"
        ).readText()
        if (!mainActivity.contains("if (BuildConfig.DEMO_MODE)")
            || !mainActivity.contains("new LiveDriverRepository")) {
            blockers += "MainActivity nie rozdziela trybu Preview od LiveDriverRepository"
        }

        if (!completeUploadSigningEnvironment) {
            blockers += "niepełne zmienne SS_UPLOAD_KEYSTORE_PATH/STORE_PASSWORD/KEY_ALIAS/KEY_PASSWORD"
        } else if (!file(uploadKeystorePath!!).isFile) {
            blockers += "SS_UPLOAD_KEYSTORE_PATH nie wskazuje istniejącego pliku"
        }

        if (blockers.isNotEmpty()) {
            throw GradleException(
                "Wydanie produkcyjne zablokowane:\n- " + blockers.joinToString("\n- ")
            )
        }
    }
}

val verifyInternalTestingReadiness = tasks.register("verifyInternalTestingReadiness") {
    group = "verification"
    description = "Weryfikuje podpisany, tylko-odczytowy AAB do Google Play Internal Testing."

    doLast {
        val blockers = mutableListOf<String>()
        val packageApproved = providers.gradleProperty("ss.packageApproved").orNull
        val readOnlyAcknowledged = providers.gradleProperty(
            "ss.internalReadOnlyAcknowledged"
        ).orNull
        val privacyPolicyUrl = providers.gradleProperty("ss.privacyPolicyUrl").orNull

        if (packageApproved != "true") {
            blockers += "brak -Pss.packageApproved=true dla pakietu z Play Console"
        }
        if (readOnlyAcknowledged != "true") {
            blockers += "brak -Pss.internalReadOnlyAcknowledged=true dla testowej wersji tylko do odczytu"
        }
        if (privacyPolicyUrl.isNullOrBlank() || !privacyPolicyUrl.startsWith("https://")) {
            blockers += "brak publicznego adresu HTTPS w -Pss.privacyPolicyUrl"
        }
        if (!android.defaultConfig.versionName.orEmpty().contains("internal")) {
            blockers += "versionName wariantu Internal Testing nie zawiera oznaczenia internal"
        }
        if (!completeUploadSigningEnvironment) {
            blockers += "niepełne zmienne SS_UPLOAD_KEYSTORE_PATH/STORE_PASSWORD/KEY_ALIAS/KEY_PASSWORD"
        } else if (!file(uploadKeystorePath!!).isFile) {
            blockers += "SS_UPLOAD_KEYSTORE_PATH nie wskazuje istniejącego pliku"
        }

        if (blockers.isNotEmpty()) {
            throw GradleException(
                "Internal Testing zablokowany:\n- " + blockers.joinToString("\n- ")
            )
        }
    }
}

tasks.matching { it.name == "assembleRelease" || it.name == "bundleRelease" }.configureEach {
    dependsOn(verifyReleaseReadiness)
}

tasks.matching { it.name == "bundleInternal" }.configureEach {
    dependsOn(verifyInternalTestingReadiness)
}
