// Agrega el permiso de CÁMARA al AndroidManifest.xml del proyecto que crea Capacitor.
// Se corre después de "npx cap add android":   npm run android:prep
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const ruta = 'android/app/src/main/AndroidManifest.xml'
if (!existsSync(ruta)) {
  console.error(`No existe ${ruta}. Corre primero: npx cap add android`)
  process.exit(1)
}

let xml = readFileSync(ruta, 'utf8')
const lineas = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />',
]

const faltan = lineas.filter((l) => !xml.includes(l.match(/android:name="([^"]+)"/)[1]))
if (faltan.length === 0) {
  console.log('El permiso de cámara ya estaba en el AndroidManifest.')
} else {
  xml = xml.replace('</manifest>', `    ${faltan.join('\n    ')}\n</manifest>`)
  writeFileSync(ruta, xml)
  console.log('Permiso de cámara agregado al AndroidManifest.')
}
