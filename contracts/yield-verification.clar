;; Yield Verification Contract
;; Validates actual harvest quantities

(define-data-var admin principal tx-sender)
(define-data-var verifier-address principal tx-sender)

;; Farm ownership mapping (simplified approach instead of cross-contract calls)
(define-map farm-owners
  { farm-id: uint }
  { owner: principal }
)

;; Yield data structure
(define-map yield-data
  { farm-id: uint, season: (string-utf8 20) }
  {
    expected-yield: uint,
    actual-yield: uint,
    verified: bool,
    verification-date: uint,
    verified-by: principal
  }
)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Check if caller is verifier
(define-private (is-verifier)
  (is-eq tx-sender (var-get verifier-address))
)

;; Register farm ownership (admin only)
(define-public (register-farm-owner (farm-id uint) (owner principal))
  (begin
    (asserts! (is-admin) (err u1))
    (map-set farm-owners { farm-id: farm-id } { owner: owner })
    (ok true)
  )
)

;; Register expected yield
(define-public (register-expected-yield
                (farm-id uint)
                (season (string-utf8 20))
                (expected-yield uint))
  (let ((farm-owner (map-get? farm-owners { farm-id: farm-id })))
    (begin
      (asserts! (is-some farm-owner) (err u1)) ;; Farm must be registered
      (asserts! (is-eq (get owner (unwrap! farm-owner (err u1))) tx-sender) (err u2)) ;; Must be farm owner
      (map-set yield-data
        { farm-id: farm-id, season: season }
        {
          expected-yield: expected-yield,
          actual-yield: u0,
          verified: false,
          verification-date: u0,
          verified-by: tx-sender
        }
      )
      (ok true)
    )
  )
)

;; Verify actual yield (only verifier can do this)
(define-public (verify-actual-yield
                (farm-id uint)
                (season (string-utf8 20))
                (actual-yield uint))
  (let ((yield-info (unwrap! (map-get? yield-data { farm-id: farm-id, season: season }) (err u3))))
    (begin
      (asserts! (is-verifier) (err u4))
      (map-set yield-data
        { farm-id: farm-id, season: season }
        {
          expected-yield: (get expected-yield yield-info),
          actual-yield: actual-yield,
          verified: true,
          verification-date: block-height,
          verified-by: tx-sender
        }
      )
      (ok true)
    )
  )
)

;; Get yield data
(define-read-only (get-yield-data (farm-id uint) (season (string-utf8 20)))
  (map-get? yield-data { farm-id: farm-id, season: season })
)

;; Calculate yield loss percentage
(define-read-only (calculate-yield-loss (farm-id uint) (season (string-utf8 20)))
  (let ((yield-info (unwrap! (map-get? yield-data { farm-id: farm-id, season: season }) (err u3))))
    (begin
      (asserts! (get verified yield-info) (err u5)) ;; Must be verified
      (asserts! (> (get expected-yield yield-info) u0) (err u6)) ;; Expected yield must be positive
      (if (>= (get actual-yield yield-info) (get expected-yield yield-info))
        (ok u0) ;; No loss
        (ok (/ (* (- (get expected-yield yield-info) (get actual-yield yield-info)) u100) (get expected-yield yield-info)))
      )
    )
  )
)

;; Set a new verifier address
(define-public (set-verifier (new-verifier principal))
  (begin
    (asserts! (is-admin) (err u7))
    (var-set verifier-address new-verifier)
    (ok true)
  )
)

;; Set a new admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err u7))
    (var-set admin new-admin)
    (ok true)
  )
)

