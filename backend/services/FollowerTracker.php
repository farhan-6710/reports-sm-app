<?php
/**
 * Follower Tracking Service
 * Tracks follower counts daily and calculates growth from database snapshots
 */

require_once __DIR__ . '/../config/database.php';

class FollowerTracker {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    /**
     * Save or update follower snapshot for an account
     * @param int $accountId Database account ID
     * @param int $followerCount Current follower count
     * @param string $date Date in Y-m-d format (defaults to today)
     * @return bool Success status
     */
    public function saveSnapshot($accountId, $followerCount, $date = null) {
        if ($date === null) {
            $date = date('Y-m-d');
        }
        
        try {
            $conn = $this->db->getConnection();
            $stmt = $conn->prepare("
                INSERT INTO follower_snapshots (account_id, date, follower_count)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    follower_count = VALUES(follower_count),
                    updated_at = CURRENT_TIMESTAMP
            ");
            
            return $stmt->execute([$accountId, $date, $followerCount]);
        } catch (Exception $e) {
            error_log("Error saving follower snapshot: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get follower count at a specific date (or closest before)
     * @param int $accountId Database account ID
     * @param string $date Date in Y-m-d format
     * @return int|null Follower count or null if not found
     */
    public function getFollowerCountAtDate($accountId, $date) {
        try {
            $conn = $this->db->getConnection();
            $stmt = $conn->prepare("
                SELECT follower_count 
                FROM follower_snapshots
                WHERE account_id = ? AND date <= ?
                ORDER BY date DESC
                LIMIT 1
            ");
            
            $stmt->execute([$accountId, $date]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $result ? (int)$result['follower_count'] : null;
        } catch (Exception $e) {
            error_log("Error getting follower count at date: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Calculate follower growth between two dates using database snapshots
     * @param int $accountId Database account ID
     * @param string $startDate Start date in Y-m-d format
     * @param string $endDate End date in Y-m-d format
     * @return array ['new_followers' => int, 'start_count' => int, 'end_count' => int, 'source' => 'database']
     */
    public function getFollowerGrowth($accountId, $startDate, $endDate) {
        $startCount = $this->getFollowerCountAtDate($accountId, $startDate);
        $endCount = $this->getFollowerCountAtDate($accountId, $endDate);
        
        if ($startCount === null || $endCount === null) {
            return [
                'new_followers' => null,
                'start_count' => $startCount,
                'end_count' => $endCount,
                'source' => 'database',
                'data_available' => false
            ];
        }
        
        $newFollowers = max(0, $endCount - $startCount);
        
        return [
            'new_followers' => $newFollowers,
            'start_count' => $startCount,
            'end_count' => $endCount,
            'source' => 'database',
            'data_available' => true
        ];
    }
    
    /**
     * Get monthly follower growth (month on month)
     * @param int $accountId Database account ID
     * @param string $month Month in Y-m format (e.g., '2025-11')
     * @return array Growth data
     */
    public function getMonthlyGrowth($accountId, $month = null) {
        if ($month === null) {
            $month = date('Y-m');
        }
        
        // Get first and last day of current month
        $startDate = $month . '-01';
        $endDate = date('Y-m-t', strtotime($startDate)); // Last day of month
        
        // Get previous month
        $prevMonth = date('Y-m', strtotime($startDate . ' -1 month'));
        $prevStartDate = $prevMonth . '-01';
        $prevEndDate = date('Y-m-t', strtotime($prevStartDate));
        
        $currentGrowth = $this->getFollowerGrowth($accountId, $startDate, $endDate);
        $previousGrowth = $this->getFollowerGrowth($accountId, $prevStartDate, $prevEndDate);
        
        return [
            'current_month' => [
                'period' => $month,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'growth' => $currentGrowth
            ],
            'previous_month' => [
                'period' => $prevMonth,
                'start_date' => $prevStartDate,
                'end_date' => $prevEndDate,
                'growth' => $previousGrowth
            ],
            'month_on_month_change' => $currentGrowth['data_available'] && $previousGrowth['data_available']
                ? $currentGrowth['new_followers'] - $previousGrowth['new_followers']
                : null
        ];
    }
    
    /**
     * Get all snapshots for an account in a date range
     * @param int $accountId Database account ID
     * @param string $startDate Start date
     * @param string $endDate End date
     * @return array Array of snapshots
     */
    public function getSnapshots($accountId, $startDate, $endDate) {
        try {
            $conn = $this->db->getConnection();
            $stmt = $conn->prepare("
                SELECT date, follower_count
                FROM follower_snapshots
                WHERE account_id = ? AND date BETWEEN ? AND ?
                ORDER BY date ASC
            ");
            
            $stmt->execute([$accountId, $startDate, $endDate]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error getting snapshots: " . $e->getMessage());
            return [];
        }
    }
}












