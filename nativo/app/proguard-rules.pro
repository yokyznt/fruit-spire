# Reglas extra de R8 para Fruit Spire (nativo).
# El juego no usa reflexión ni serialización por clases: R8 puede reducir y ofuscar todo con seguridad.
# Compose y AndroidX traen sus propias reglas.

# Los nombres reales de las pantallas ayudan a leer un fallo de Play Console: se conservan los números de línea
# y se oculta el nombre del archivo fuente.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Quita los registros de depuración de la versión de lanzamiento.
-assumenosideeffects class android.util.Log {
    public static int d(...);
    public static int v(...);
}
