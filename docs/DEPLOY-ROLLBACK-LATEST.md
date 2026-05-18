# Rollback Plan (auto) — Summa Social

Generat: 2026-05-18 12:33
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: b835caba5
SHA branca a publicar (main): e6b74896d

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert e6b74896d --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard b835caba5
git push origin prod --force-with-lease
```
