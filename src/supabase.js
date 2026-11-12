// src/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export const BUCKET = 'snaps'

// De una URL pública del bucket saca la ruta del archivo ("uid/uuid.jpg")
export const rutaDesdeUrl = (url) => {
  const marca = `/${BUCKET}/`
  const i = url.indexOf(marca)
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length).split('?')[0])
}

// Sube una foto (Blob/File) a la carpeta del usuario y crea su fila en "multimedia"
export async function subirFoto(blob, usuarioId) {
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
  const ruta = `${usuarioId}/${crypto.randomUUID()}.${extension}`

  const { error: errSubida } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, blob, { contentType: blob.type || 'image/jpeg' })
  if (errSubida) throw errSubida

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(ruta)

  const { data, error } = await supabase
    .from('multimedia')
    .insert({ url: pub.publicUrl, usuario_id: usuarioId })
    .select('id, url')
    .single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([ruta]) // no dejar archivos huérfanos
    throw error
  }
  return data
}

// Borra una foto: primero el archivo del bucket y luego su fila (los snaps caen por cascade)
export async function borrarFoto(multimedia) {
  const ruta = rutaDesdeUrl(multimedia.url)
  if (ruta) await supabase.storage.from(BUCKET).remove([ruta])
  return supabase.from('multimedia').delete().eq('id', multimedia.id)
}
