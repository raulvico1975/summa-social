# Rollback Plan (auto) — Summa Social

Generat: 2026-02-27 15:29
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 302e884
SHA main a publicar: 49b5413

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 49b5413 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 302e884
git push origin prod --force-with-lease
```
