const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const port = 3000;

// MySQL 데이터베이스 연결 설정
const connection = mysql.createConnection({
    host: 'localhost',
    user: '202101467user',
    password: '202101467pw',
    database: 'agodaDB'
});

// 데이터베이스 연결
connection.connect((err) => {
    if (err) throw err;
    console.log('MySQL에 연결되었습니다!');
});

// bodyParser 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());  // 추가된 부분: JSON 데이터를 처리하기 위해 추가

// 정적 파일 제공
app.use(express.static('public'));

// 로그인 요청 처리
app.post('/login', (req, res) => {
    const { custid, custpw } = req.body;
    
    // 요청 데이터 콘솔 로그로 출력
    console.log('로그인 요청 수신:', req.body);

    if (!custid || !custpw) {
        return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });
    }

    const query = `SELECT * FROM Customer WHERE custid = ? AND custpw = ?`;
    connection.query(query, [custid, custpw], (err, results) => {
        if (err) {
            console.error('데이터베이스 쿼리 오류:', err);
            return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
        }

        if (results.length > 0) {
            if (custid === 'Admin' && custpw === 'admin') {
                res.json({ success: true, isAdmin: true });
            } else {
                res.json({ success: true, isAdmin: false });
            }
        } else {
            res.json({ success: false, message: '아이디 또는 비밀번호가 잘못되었습니다.' });
        }
    });
});

// 고객 숙소 검색 요청 처리
app.post('/search', (req, res) => {
    const { roomname, roomtype, location } = req.body;
    let query = 'SELECT * FROM Room WHERE 1=1';
    const queryParams = [];

    if (roomname) {
        query += ' AND roomname LIKE ?';
        queryParams.push(`%${roomname}%`);
    }
    if (roomtype) {
        query += ' AND roomtype LIKE ?';
        queryParams.push(`%${roomtype}%`);
    }
    if (location) {
        query += ' AND location LIKE ?';
        queryParams.push(`%${location}%`);
    }

    connection.query(query, queryParams, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(results);
        }
    });
});

// 관리자 페이지에서 사용자 목록을 요청하는 엔드포인트
app.get('/admin/users', (req, res) => {
    const query = 'SELECT * FROM Customer';
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(results);
        }
    });
});

// 관리자 페이지에서 숙소 목록을 요청하는 엔드포인트
app.get('/admin/rooms', (req, res) => {
    const query = 'SELECT * FROM Room';
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(results);
        }
    });
});

// 관리자 페이지에서 예약 목록을 요청하는 엔드포인트
app.get('/admin/reservations', (req, res) => {
    const query = 'SELECT * FROM Reservation';
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(results);
        }
    });
});

// 관리자 페이지에서 리뷰 목록을 요청하는 엔드포인트
app.get('/admin/reviews', (req, res) => {
    const query = 'SELECT * FROM Review';
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(results);
        }
    });
});

// 사용자 추가 엔드포인트
app.post('/admin/addUser', (req, res) => {
    const { name, custid, custpw, number, email } = req.body;
    console.log(req.body); // req.body 내용 확인
    console.log(name, custid, custpw, number, email);
    // 데이터베이스에 새로운 사용자 추가
    const query = 'INSERT INTO Customer (name, custid, custpw, number, email) VALUES (?, ?, ?, ?, ?)';
    connection.query(query, [name, custid, custpw, number, email], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ message: '사용자가 성공적으로 추가되었습니다.' });
        }
    });
});

// 사용자 삭제 엔드포인트
app.post('/admin/deleteUser', (req, res) => {
    const { custid } = req.body;
    console.log('삭제 요청:', req.body); // 요청 내용 로그
    console.log('삭제할 사용자 아이디:', custid);

    // 외래 키 제약 조건을 비활성화하고 사용자 삭제
    const disableForeignKeyChecks = 'SET FOREIGN_KEY_CHECKS = 0;';
    const enableForeignKeyChecks = 'SET FOREIGN_KEY_CHECKS = 1;';
    const deleteUserReservations = 'DELETE FROM Reservation WHERE custnum = (SELECT custnum FROM Customer WHERE custid = ?);';
    const deleteUserReviews = 'DELETE FROM Review WHERE custnum = (SELECT custnum FROM Customer WHERE custid = ?);';
    const deleteUser = 'DELETE FROM Customer WHERE custid = ?';

    connection.query(disableForeignKeyChecks, (err) => {
        if (err) {
            console.error('외래 키 체크 비활성화 오류:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        connection.query(deleteUserReservations, [custid], (err) => {
            if (err) {
                console.error('예약 삭제 오류:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            connection.query(deleteUserReviews, [custid], (err) => {
                if (err) {
                    console.error('리뷰 삭제 오류:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                connection.query(deleteUser, [custid], (err, results) => {
                    if (err) {
                        console.error('사용자 삭제 오류:', err);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }

                    connection.query(enableForeignKeyChecks, (err) => {
                        if (err) {
                            console.error('외래 키 체크 활성화 오류:', err);
                            return res.status(500).json({ error: 'Internal Server Error' });
                        }

                        if (results.affectedRows === 0) {
                            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
                        } else {
                            return res.json({ message: '사용자가 성공적으로 삭제되었습니다.' });
                        }
                    });
                });
            });
        });
    });
});

// 사용자 수정 엔드포인트
app.post('/admin/updateUser', (req, res) => {
    const { custid, name, custpw, number, email } = req.body;
    console.log(req.body); // req.body 내용 확인
    // 데이터베이스에서 사용자 수정
    const query = 'UPDATE Customer SET name = ?, custpw = ?, number = ?, email = ? WHERE custid = ?';
    connection.query(query, [name, custpw, number, email, custid], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else if (results.affectedRows === 0) {
            res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        } else {
            res.json({ message: '사용자가 성공적으로 수정되었습니다.' });
        }
    });
});

// 숙소 추가 엔드포인트
app.post('/admin/addRoom', (req, res) => {
    const { roomname, roomtype, location, perprice } = req.body;
    console.log(req.body); // req.body 내용 확인
    // 데이터베이스에 새로운 숙소 추가
    const query = 'INSERT INTO Room (roomname, roomtype, location, perprice) VALUES (?, ?, ?, ?)';
    connection.query(query, [roomname, roomtype, location, perprice], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ message: '숙소가 성공적으로 추가되었습니다.' });
        }
    });
});

// 숙소 삭제 엔드포인트
app.post('/admin/deleteRoom', (req, res) => {
    const { roomid } = req.body;
    console.log('삭제 요청:', req.body); // 요청 내용 로그
    console.log('삭제할 숙소 아이디:', roomid);

    // 외래 키 제약 조건을 비활성화하고 숙소 삭제
    const disableForeignKeyChecks = 'SET FOREIGN_KEY_CHECKS = 0;';
    const enableForeignKeyChecks = 'SET FOREIGN_KEY_CHECKS = 1;';
    const deleteRoomReservations = 'DELETE FROM Reservation WHERE roomid = ?;';
    const deleteRoomReviews = 'DELETE FROM Review WHERE roomid = ?;';
    const deleteRoom = 'DELETE FROM Room WHERE roomid = ?';

    connection.query(disableForeignKeyChecks, (err) => {
        if (err) {
            console.error('외래 키 체크 비활성화 오류:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        connection.query(deleteRoomReservations, [roomid], (err) => {
            if (err) {
                console.error('예약 삭제 오류:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            connection.query(deleteRoomReviews, [roomid], (err) => {
                if (err) {
                    console.error('리뷰 삭제 오류:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                connection.query(deleteRoom, [roomid], (err, results) => {
                    if (err) {
                        console.error('숙소 삭제 오류:', err);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }

                    connection.query(enableForeignKeyChecks, (err) => {
                        if (err) {
                            console.error('외래 키 체크 활성화 오류:', err);
                            return res.status(500).json({ error: 'Internal Server Error' });
                        }

                        if (results.affectedRows === 0) {
                            return res.status(404).json({ error: '숙소를 찾을 수 없습니다.' });
                        } else {
                            return res.json({ message: '숙소가 성공적으로 삭제되었습니다.' });
                        }
                    });
                });
            });
        });
    });
});

// 숙소 수정 엔드포인트
app.post('/admin/updateRoom', (req, res) => {
    const { roomid, roomname, roomtype, location, perprice } = req.body;
    console.log(req.body); // req.body 내용 확인
    // 데이터베이스에서 숙소 수정
    const query = 'UPDATE Room SET roomname = ?, roomtype = ?, location = ?, perprice = ? WHERE roomid = ?';
    connection.query(query, [roomname, roomtype, location, perprice, roomid], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else if (results.affectedRows === 0) {
            res.status(404).json({ error: '숙소를 찾을 수 없습니다.' });
        } else {
            res.json({ message: '숙소가 성공적으로 수정되었습니다.' });
        }
    });
});

// 예약 추가 엔드포인트
app.post('/admin/addReservation', (req, res) => {
    const { roomid, custid, checkin, checkout, perprice } = req.body;
    const totalDays = (new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24);
    const totalprice = totalDays * perprice;
    console.log(req.body); // req.body 내용 확인
    // 데이터베이스에 새로운 예약 추가
    const query = 'INSERT INTO Reservation (custnum, roomid, checkin, checkout, totalprice) VALUES ((SELECT custnum FROM Customer WHERE custid = ?), ?, ?, ?, ?)';
    connection.query(query, [custid, roomid, checkin, checkout, totalprice], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ message: '예약이 성공적으로 추가되었습니다.' });
        }
    });
});

// 예약 삭제 엔드포인트
app.post('/admin/deleteReservation', (req, res) => {
    const { reservid } = req.body;
    console.log('삭제 요청:', req.body); // 요청 내용 로그
    console.log('삭제할 예약 아이디:', reservid);

    const deleteReservation = 'DELETE FROM Reservation WHERE reservid = ?';

    connection.query(deleteReservation, [reservid], (err, results) => {
        if (err) {
            console.error('예약 삭제 오류:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
        } else {
            return res.json({ message: '예약이 성공적으로 삭제되었습니다.' });
        }
    });
});

// 예약 수정 엔드포인트
app.post('/admin/updateReservation', (req, res) => {
    const { reservid, roomid, custid, checkin, checkout, perprice } = req.body;
    const totalDays = (new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24);
    const totalprice = totalDays * perprice;
    console.log(req.body); // req.body 내용 확인
    // 데이터베이스에서 예약 수정
    const query = 'UPDATE Reservation SET roomid = ?, custnum = (SELECT custnum FROM Customer WHERE custid = ?), checkin = ?, checkout = ?, totalprice = ? WHERE reservid = ?';
    connection.query(query, [roomid, custid, checkin, checkout, totalprice, reservid], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else if (results.affectedRows === 0) {
            res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
        } else {
            res.json({ message: '예약이 성공적으로 수정되었습니다.' });
        }
    });
});

// 리뷰 추가 엔드포인트
app.post('/admin/addReview', (req, res) => {
    const { roomid, contents, starrating, custid } = req.body;
    console.log(req.body); // req.body 내용 확인
    // 데이터베이스에 새로운 리뷰 추가
    const query = 'INSERT INTO Review (custnum, roomid, contents, starrating) VALUES ((SELECT custnum FROM Customer WHERE custid = ?), ?, ?, ?)';
    connection.query(query, [custid, roomid, contents, starrating], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ message: '리뷰가 성공적으로 추가되었습니다.' });
        }
    });
});

// 리뷰 삭제 엔드포인트
app.post('/admin/deleteReview', (req, res) => {
    const { reviewid } = req.body;
    console.log('삭제 요청:', req.body); // 요청 내용 로그
    console.log('삭제할 리뷰 아이디:', reviewid);

    const deleteReview = 'DELETE FROM Review WHERE reviewid = ?';

    connection.query(deleteReview, [reviewid], (err, results) => {
        if (err) {
            console.error('리뷰 삭제 오류:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: '리뷰를 찾을 수 없습니다.' });
        } else {
            return res.json({ message: '리뷰가 성공적으로 삭제되었습니다.' });
        }
    });
});

// 리뷰 수정 엔드포인트
app.post('/admin/updateReview', (req, res) => {
    const { reviewid, roomid, custid, contents, starrating } = req.body;
    console.log(req.body); // req.body 내용 확인
    // 데이터베이스에서 리뷰 수정
    const query = 'UPDATE Review SET roomid = ?, custnum = (SELECT custnum FROM Customer WHERE custid = ?), contents = ?, starrating = ? WHERE reviewid = ?';
    connection.query(query, [roomid, custid, contents, starrating, reviewid], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else if (results.affectedRows === 0) {
            res.status(404).json({ error: '리뷰를 찾을 수 없습니다.' });
        } else {
            res.json({ message: '리뷰가 성공적으로 수정되었습니다.' });
        }
    });
});

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행중입니다.`);
});
