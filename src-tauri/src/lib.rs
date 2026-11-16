//! Hôte Tauri de Pomone : l'import et le rendu sont faits par le moteur TypeScript
//! (packages/core) dans la fenêtre ; Rust n'écrit que les fichiers choisis par l'utilisateur.

use serde::Deserialize;
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Deserialize)]
struct Fichier {
    chemin: String,
    contenu: String,
}

/// Refuse tout chemin qui sortirait du dossier d'export (absolu, « .. », lecteur).
fn chemin_relatif(chemin: &str) -> Result<PathBuf, String> {
    let p = Path::new(chemin);
    if !chemin.is_empty() && p.components().all(|c| matches!(c, Component::Normal(_))) {
        Ok(p.to_path_buf())
    } else {
        Err(format!("Chemin refusé : {chemin}"))
    }
}

/// Écrit les pages du site dans le dossier choisi par l'utilisateur.
#[tauri::command]
fn ecrire_site(dossier: String, fichiers: Vec<Fichier>) -> Result<usize, String> {
    let racine = PathBuf::from(dossier);
    for f in &fichiers {
        let cible = racine.join(chemin_relatif(&f.chemin)?);
        if let Some(parent) = cible.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("{} : {e}", parent.display()))?;
        }
        fs::write(&cible, &f.contenu).map_err(|e| format!("{} : {e}", cible.display()))?;
    }
    Ok(fichiers.len())
}

/// Écrit un fichier unique (verger.html, classeur .xlsx) à l'emplacement choisi.
#[tauri::command]
fn ecrire_fichier(chemin: String, octets: Vec<u8>) -> Result<(), String> {
    fs::write(&chemin, octets).map_err(|e| format!("{chemin} : {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![ecrire_site, ecrire_fichier])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de Pomone");
}

#[cfg(test)]
mod tests {
    use super::chemin_relatif;

    #[test]
    fn refuse_les_sorties_du_dossier() {
        assert!(chemin_relatif("allees/A1.html").is_ok());
        assert!(chemin_relatif("../secret").is_err());
        assert!(chemin_relatif("/etc/passwd").is_err());
        assert!(chemin_relatif("").is_err());
    }
}
