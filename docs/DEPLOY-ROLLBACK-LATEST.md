# Rollback Plan (auto) — Summa Social

Generat: 2026-02-23 16:44
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: c971139
SHA main a publicar: 0a1ac52

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 0a1ac52 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard c971139
git push origin prod --force-with-lease
```
