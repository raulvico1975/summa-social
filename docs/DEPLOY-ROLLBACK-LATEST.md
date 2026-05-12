# Rollback Plan (auto) — Summa Social

Generat: 2026-05-12 18:13
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 42ae066e4
SHA branca a publicar (main): 7a0f246fd

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 7a0f246fd --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 42ae066e4
git push origin prod --force-with-lease
```
