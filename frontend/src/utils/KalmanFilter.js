/**
 * KalmanFilter - 2D Constant Velocity Model
 * 
 * Purpose: ESTIMATE true state (position & velocity) from NOISY measurements
 * 
 * State Vector [x, y, dx, dy]
 * - x, y: Position
 * - dx, dy: Velocity
 */

class KalmanFilter {
    constructor(initialX, initialY, initialVelocity = 0, dt = 1 / 30) {
        // Time step (approximate, e.g. 1/30 sec)
        this.dt = dt;

        // State vector [x, y, dx, dy]
        this.x = [initialX, initialY, 0, 0];

        // State Covariance Matrix (P) - Uncertainty in our estimate
        // Start with high uncertainty
        this.P = [
            [100, 0, 0, 0],
            [0, 100, 0, 0],
            [0, 0, 100, 0],
            [0, 0, 0, 100]
        ];

        // State Transition Matrix (A) - Physics model (New = Old + Velocity * Time)
        // x = x + dx*dt
        // y = y + dy*dt
        // dx = dx
        // dy = dy
        this.A = [
            [1, 0, this.dt, 0],
            [0, 1, 0, this.dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];

        // Measurement Matrix (H) - We measure [x, y] only
        this.H = [
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ];

        // Measurement Noise Covariance (R) - How noisy is the detector?
        // Higher = trust measurement less (smoother but laggy)
        // Lower = trust measurement more (jittery but responsive)
        const R_pos = 10; // Jitter variance (pixels^2)
        this.R = [
            [R_pos, 0],
            [0, R_pos]
        ];

        // Process Noise Covariance (Q) - How much can the object accelerate/turn?
        // Allows the model to adapt to real changes in velocity
        const Q_pos = 1;
        const Q_vel = 1; // Acceleration variance
        this.Q = [
            [Q_pos * this.dt, 0, 0, 0],
            [0, Q_pos * this.dt, 0, 0],
            [0, 0, Q_vel * this.dt, 0],
            [0, 0, 0, Q_vel * this.dt]
        ];
    }

    /**
     * Prediction Step: Estimate next state based on physics model
     */
    predict() {
        // x = A * x
        const newX = [
            this.A[0][0] * this.x[0] + this.A[0][2] * this.x[2],
            this.A[1][1] * this.x[1] + this.A[1][3] * this.x[3],
            this.x[2],
            this.x[3]
        ];
        this.x = newX;

        // P = A * P * A^T + Q
        // (Simplified diagonal update for performance since A has 0s)
        const newP = [...this.P.map(row => [...row])];

        // P' = A*P*A^T + Q approximation
        // This is a naive matrix multiplication implementation for 4x4
        // sufficient for this specific sparse matrix A

        // Let's implement generic 4x4 matrix multiplication helper
        // or just use the known structure of A
        // A * P
        const AP = this.multiply(this.A, this.P);
        // (A * P) * A^T
        const AP_AT = this.multiply(AP, this.transpose(this.A));

        // + Q
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                this.P[i][j] = AP_AT[i][j] + this.Q[i][j];
            }
        }

        return { x: this.x[0], y: this.x[1] };
    }

    /**
     * Update Step: Correct estimate with new measurement
     * @param {number} mx Measured X
     * @param {number} my Measured Y
     */
    correct(mx, my) {
        // Innovation (Measurement Residual): y = z - H * x
        const y = [
            mx - this.x[0],
            my - this.x[1]
        ];

        // Innovation Covariance: S = H * P * H^T + R
        // H is just selecting the top-left 2x2 of P basically
        const S = [
            [this.P[0][0] + this.R[0][0], this.P[0][1]],
            [this.P[1][0], this.P[1][1] + this.R[1][1]]
        ];

        // Optimal Kalman Gain: K = P * H^T * S^-1
        // Calculate S inverse (2x2 matrix inversion)
        const det = S[0][0] * S[1][1] - S[0][1] * S[1][0];
        const S_inv = [
            [S[1][1] / det, -S[0][1] / det],
            [-S[1][0] / det, S[0][0] / det]
        ];

        // K computes how much we trust the innovation
        // K is 4x2
        // K = P * H^T * inv(S)
        const PHt = [
            [this.P[0][0], this.P[0][1]],
            [this.P[1][0], this.P[1][1]],
            [this.P[2][0], this.P[2][1]],
            [this.P[3][0], this.P[3][1]]
        ];

        const K = this.multiply(PHt, S_inv);

        // Update State: x = x + K * y
        this.x[0] += K[0][0] * y[0] + K[0][1] * y[1];
        this.x[1] += K[1][0] * y[0] + K[1][1] * y[1];
        this.x[2] += K[2][0] * y[0] + K[2][1] * y[1];
        this.x[3] += K[3][0] * y[0] + K[3][1] * y[1];

        // Update Covariance: P = (I - K * H) * P
        // I - K*H is 4x4
        const I = [
            [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]
        ];

        // K*H (4x2 * 2x4) -> 4x4
        // H has 1s at [0,0] and [1,1]
        const KH = [
            [K[0][0], K[0][1], 0, 0],
            [K[1][0], K[1][1], 0, 0],
            [K[2][0], K[2][1], 0, 0],
            [K[3][0], K[3][1], 0, 0]
        ];

        const I_KH = [
            [I[0][0] - KH[0][0], I[0][1] - KH[0][1], 0, 0],
            [I[1][0] - KH[1][0], I[1][1] - KH[1][1], 1, 0],
            [I[2][0] - KH[2][0], I[2][1] - KH[2][1], 1, 0],
            [I[3][0] - KH[3][0], I[3][1] - KH[3][1], 0, 1]
        ]; // Simplification for KH zeros

        // Full matrix subtract
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                I_KH[r][c] = I[r][c] - KH[r][c];
            }
        }

        this.P = this.multiply(I_KH, this.P);

        return { x: this.x[0], y: this.x[1] };
    }

    getEstimate() {
        return {
            x: this.x[0],
            y: this.x[1],
            vx: this.x[2], // pixels per dt
            vy: this.x[3]
        };
    }

    // Matrix Helper: Multiply
    multiply(A, B) {
        const result = [];
        for (let i = 0; i < A.length; i++) {
            result[i] = [];
            for (let j = 0; j < B[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < A[0].length; k++) {
                    sum += A[i][k] * B[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }

    // Matrix Helper: Transpose
    transpose(A) {
        return A[0].map((_, colIndex) => A.map(row => row[colIndex]));
    }
}

export default KalmanFilter;
