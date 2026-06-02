# Rollback Plan (auto) — Summa Social

Generat: 2026-06-02 16:46
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 047a37fe0
SHA branca a publicar (main): 037bbf1c5

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 037bbf1c5 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 047a37fe0
git push origin prod --force-with-lease
```
