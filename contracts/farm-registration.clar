;; Farm Registration Contract
;; Records details of insured agricultural operations

(define-data-var admin principal tx-sender)

;; Farm data structure
(define-map farms
  { farm-id: uint }
  {
    owner: principal,
    location: (string-utf8 100),
    crop-type: (string-utf8 50),
    area-size: uint,
    registered-at: uint,
    active: bool
  }
)

;; Counter for farm IDs
(define-data-var farm-id-counter uint u0)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Register a new farm
(define-public (register-farm
                (location (string-utf8 100))
                (crop-type (string-utf8 50))
                (area-size uint))
  (let ((new-id (+ (var-get farm-id-counter) u1)))
    (begin
      (asserts! (> area-size u0) (err u1)) ;; Area must be positive
      (var-set farm-id-counter new-id)
      (map-set farms
        { farm-id: new-id }
        {
          owner: tx-sender,
          location: location,
          crop-type: crop-type,
          area-size: area-size,
          registered-at: block-height,
          active: true
        }
      )
      (ok new-id)
    )
  )
)

;; Update farm details
(define-public (update-farm
                (farm-id uint)
                (location (string-utf8 100))
                (crop-type (string-utf8 50))
                (area-size uint))
  (let ((farm-data (unwrap! (map-get? farms { farm-id: farm-id }) (err u2))))
    (begin
      (asserts! (is-eq (get owner farm-data) tx-sender) (err u3)) ;; Only owner can update
      (asserts! (> area-size u0) (err u1)) ;; Area must be positive
      (map-set farms
        { farm-id: farm-id }
        {
          owner: tx-sender,
          location: location,
          crop-type: crop-type,
          area-size: area-size,
          registered-at: (get registered-at farm-data),
          active: (get active farm-data)
        }
      )
      (ok true)
    )
  )
)

;; Deactivate a farm
(define-public (deactivate-farm (farm-id uint))
  (let ((farm-data (unwrap! (map-get? farms { farm-id: farm-id }) (err u2))))
    (begin
      (asserts! (or (is-eq (get owner farm-data) tx-sender) (is-admin)) (err u3))
      (map-set farms
        { farm-id: farm-id }
        (merge farm-data { active: false })
      )
      (ok true)
    )
  )
)

;; Get farm details
(define-read-only (get-farm (farm-id uint))
  (map-get? farms { farm-id: farm-id })
)

;; Set a new admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err u4))
    (var-set admin new-admin)
    (ok true)
  )
)

