#!/usr/bin/env bash
# TRACE CI/CD 점검 (읽기 전용). 아무것도 바꾸지 않는다. 비밀값은 이름만 본다(값은 gh도 못 읽음).
# 확인하는 것: CodeRabbit 앱 설치·리뷰, SonarQube 설정·실제 분석, 알림·배포 설정, 최근 워크플로 결과, 브랜치 보호
# 쓰는 법: bash check-cicd.sh   (gh auth login 된 조직 관리자 계정)
set -uo pipefail
ORG="${ORG:-GAKDO}"
SERVERS="gateway auth_server rental_server capture_server diagnostics_server report_server"
REPOS="$SERVERS web contracts gitops agent booth ml"
ok(){ printf "  ✅ %s\n" "$*"; }; no(){ printf "  ❌ %s\n" "$*"; }; warn(){ printf "  ⚠️  %s\n" "$*"; }

command -v gh >/dev/null || { echo "gh가 없습니다: brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh 로그인이 필요합니다: gh auth login"; exit 1; }

ORG_SECRETS="$(gh secret list --org "$ORG" --json name -q '.[].name' 2>/dev/null || true)"
ORG_VARS="$(gh variable list --org "$ORG" --json name,value -q '.[]|"\(.name)=\(.value)"' 2>/dev/null || true)"
has_secret(){ # $1 repo $2 name → 0 if repo or org has it
  grep -qx "$2" <<<"$ORG_SECRETS" && return 0
  gh secret list -R "$ORG/$1" --json name -q '.[].name' 2>/dev/null | grep -qx "$2"
}
var_val(){ # $1 repo $2 name → repo value first, then org
  local v; v="$(gh variable list -R "$ORG/$1" --json name,value -q ".[]|select(.name==\"$2\")|.value" 2>/dev/null)"
  [ -n "$v" ] && { echo "$v"; return; }
  sed -n "s/^$2=//p" <<<"$ORG_VARS" | head -1
}

echo "== 1. CodeRabbit (PR 자동 한국어 리뷰)"
apps="$(gh api "orgs/$ORG/installations" --jq '.installations[].app_slug' 2>/dev/null || true)"
installed=0
if grep -qi coderabbit <<<"$apps"; then ok "조직에 CodeRabbit 앱이 설치돼 있음"; installed=1
elif [ -n "$apps" ]; then no "조직에 CodeRabbit 앱이 없음 (설치된 앱: $(tr '\n' ' ' <<<"$apps"))"
else warn "설치 앱 목록을 못 읽음(gh 토큰에 admin:org 권한 없음) → 아래 PR 리뷰로 판단"; fi
seen=0; old=0
for r in $REPOS; do
  prs="$(gh api "repos/$ORG/$r/pulls?state=all&per_page=3" --jq '.[].number' 2>/dev/null)"
  [ -z "$prs" ] && continue
  for n in $prs; do
    who="$( { gh api "repos/$ORG/$r/issues/$n/comments" --jq '.[].user.login' 2>/dev/null; gh api "repos/$ORG/$r/pulls/$n/reviews" --jq '.[].user.login' 2>/dev/null; } | grep -i coderabbit | head -1)"
    if [ -n "$who" ]; then ok "$r PR #$n 에 CodeRabbit 리뷰 있음"; seen=1
    elif [ $installed = 0 ]; then no "$r PR #$n 에 CodeRabbit 리뷰 없음"; else old=$((old+1)); fi
  done
done
if [ $installed = 1 ] && [ $seen = 0 ]; then
  echo "  ℹ️  리뷰 없는 PR ${old}개는 앱 설치 전에 만든 PR이라 정상입니다. 새 PR부터 리뷰가 달립니다"
  echo "     (지금 확인하려면 열린 PR에 댓글로 @coderabbitai review)"
elif [ $seen = 0 ]; then warn "최근 PR 어디에도 CodeRabbit 리뷰가 없습니다 → 앱 미설치 또는 레포 접근 미허용"; fi

echo; echo "== 2. SonarQube (서버 6개, develop·main push 때 분석)"
for n in SONAR_TOKEN SONAR_HOST_URL; do
  if has_secret gateway "$n"; then ok "Secret $n 있음"; else no "Secret $n 없음"; fi
done
for r in $SERVERS; do
  en="$(var_val "$r" SONAR_ENABLED)"
  [ "$en" = "true" ] && ok "$r SONAR_ENABLED=true" || no "$r SONAR_ENABLED=${en:-없음} → 분석 단계를 건너뜀"
done
for r in $SERVERS; do
  run="$(gh run list -R "$ORG/$r" -w backend-ci -e push -L 1 --json databaseId -q '.[0].databaseId' 2>/dev/null)"
  [ -z "$run" ] && run="$(gh run list -R "$ORG/$r" -w 배포 -e push -L 1 --json databaseId -q '.[0].databaseId' 2>/dev/null)"
  if [ -z "$run" ]; then warn "$r push 실행 기록 없음(아직 develop·main에 push 없음)"; continue; fi
  steps="$(gh run view "$run" -R "$ORG/$r" --json jobs -q '.jobs[].steps[]|select(.name|startswith("SonarQube"))|"\(.name)=\(.conclusion)"' 2>/dev/null)"
  st="$(sed -n 's/^SonarQube 분석=//p' <<<"$steps" | head -1)"
  alert="$(sed -n 's/^SonarQube 실패 알림=//p' <<<"$steps" | head -1)"
  if [ -z "$st" ]; then warn "$r 실행 #$run: SonarQube 단계를 못 찾음(아직 진행 중일 수 있음)"; continue; fi
  if [ "$st" = skipped ]; then no "$r 실행 #$run: SonarQube 단계 건너뜀(그때 SONAR_ENABLED가 꺼져 있었음)"; continue; fi
  # 로그 첫머리에 스크립트 원문(echo ...)이 찍히므로 원문 줄은 빼고 실제 출력만 본다
  log="$(gh run view "$run" -R "$ORG/$r" --log 2>/dev/null | grep -v 'echo "SONAR_TOKEN')"
  if grep -q "ANALYSIS SUCCESSFUL\|EXECUTION SUCCESS" <<<"$log"; then ok "$r 실행 #$run: SonarQube 분석 성공"
  elif grep -q "SONAR_TOKEN이 없어" <<<"$log"; then no "$r 실행 #$run: 그때 토큰이 없어 분석 건너뜀(다음 develop push부터 분석)"
  elif [ "$alert" = success ]; then
    why="$(grep -m1 -E "\[ERROR\]|ERROR:" <<<"$log" | sed 's/.*\(\[ERROR\]\|ERROR:\)//' | cut -c1-160)"
    no "$r 실행 #$run: SonarQube 분석 실패 — ${why:-로그 확인}"
  else warn "$r 실행 #$run: 분석 결과를 로그에서 못 찾음(진행 중이거나 로그 만료)"; fi
done

echo; echo "== 3. 알림·배포 설정"
for r in $REPOS; do
  d="$(var_val "$r" DISCORD_ENABLED)"; w=no; has_secret "$r" DISCORD_WEBHOOK_URL && w=yes
  [ "$d" = "true" ] && [ $w = yes ] && ok "$r 디스코드 알림 켜짐" || no "$r 디스코드 알림 꺼짐(DISCORD_ENABLED=${d:-없음}, 웹훅 $w)"
done
has_secret gateway GITOPS_TOKEN && ok "GITOPS_TOKEN 있음(배포 태그 갱신)" || no "GITOPS_TOKEN 없음 → 이미지까지만, 배포 갱신 건너뜀"
for v in SMOKE_API_URL SMOKE_WEB_URL; do [ -n "$(var_val gateway $v)" ] && ok "$v 있음" || warn "$v 없음 → 연기 시험·자동 롤백 건너뜀(클러스터 뜬 뒤 넣기)"; done

echo; echo "== 4. 최근 워크플로 결과 (워크플로마다 마지막 실행)"
for r in $REPOS; do
  line="$(gh run list -R "$ORG/$r" -L 40 --json workflowName,conclusion,status -q 'group_by(.workflowName)|map(.[0])|map("\(.workflowName):\(if .status=="completed" then .conclusion else .status end)")|join("  ")' 2>/dev/null)"
  printf "  %-19s %s\n" "$r" "${line:-실행 기록 없음}"
done

echo; echo "== 5. 브랜치 보호 (main·develop에 PR 필수 + CI 통과 필수)"
for r in $REPOS; do
  out=""
  for b in main develop; do
    if gh api "repos/$ORG/$r/branches/$b/protection" >/dev/null 2>&1 || \
       [ -n "$(gh api "repos/$ORG/$r/rules/branches/$b" --jq '.[].type' 2>/dev/null | grep -E 'pull_request|required_status_checks')" ]; then out="$out $b:✅"; else out="$out $b:❌"; fi
  done
  printf "  %-19s%s\n" "$r" "$out"
done
echo; echo "끝. 이 출력을 그대로 붙여 주시면 빠진 것만 골라 정리해 드릴게요. (비밀값은 출력에 없습니다)"
