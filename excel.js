// Firebase SDK 불러오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, getDownloadURL, uploadBytesResumable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AizaSyAxfXZ7fOgO4ZxffXp4fsAjAcTmMQrwuQ",
  authDomain: "fitgirlviki.firebaseapp.com",
  projectId: "fitgirlviki",
  storageBucket: "fitgirlviki.firebasestorage.app",
  messagingSenderId: "207468197936",
  appId: "1:207468197936:web:70ea3baa845e403722555f5"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// 엑셀 파일명 설정
const fileName = "contract.xlsx";

// 주문 저장 및 엑셀 업로드 함수
export async function updateExcelRow(orderId, updateData, updateOnly = false) {
  if (!orderId) {
    console.error("OrderID is required");
    return false;
  }
  console.log("Updating Excel:", orderId, updateData);
  try {
    let workbook;
    const sheetName = "주문서";
    
    const encodedFileName = encodeURIComponent(fileName);
    const fileRef = ref(storage, encodedFileName);
    const url = await getDownloadURL(fileRef);
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    
    workbook = XLSX.read(data, { type: "array" });
    
    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error("Sheet not found");
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {defval: "", raw: false});

    console.log("📌 전체 행 ID 목록:", rows.map(r => r.ID));
    console.log("📌 비교용 orderId:", orderId);
    
    const rowIndex = rows.findIndex(row =>
      String(row.ID || '').trim().toLowerCase() === String(orderId || '').trim().toLowerCase()
    );

    if (rowIndex === -1) {
      console.warn("Row not found for ID:", orderId);
      const newRow = {
        ID: orderId,
        ...updateData
      };
      // Remove empty fields
      Object.keys(newRow).forEach(key => {
        if (newRow[key] === "") delete newRow[key];
      });
      rows.push(newRow);
    } else {
      // Only update specified fields in existing row
      Object.keys(updateData).forEach(key => {
        rows[rowIndex][key] = updateData[key];
      });
    }
    
    // Convert back to worksheet
    const newWorksheet = XLSX.utils.json_to_sheet(rows);
    workbook.Sheets[sheetName] = newWorksheet;
    
    // Save to Firebase Storage
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    await uploadBytesResumable(fileRef, blob);
    
    return true;
  } catch (error) {
    console.error("Excel 업데이트 오류:", error);
    throw error;
  }
}

export async function saveOrderAndUploadToExcel(orderData) {
  try {
    // 기존 엑셀 파일 가져오기
    let workbook;
    let existingData = [];
    const sheetName = "주문서";
    const headerRow = [
      "ID", "고객명", "전화번호", "쇼핑몰", "귀걸이", "귀찌",
      "팔찌_8라인", "팔찌_6라인", "팔찌_3라인", "팔찌_2라인",
      "반지", "포토후기", "송장번호", "배송예정일", "주문완료알림톡",
      "상품발송알림톡", "포토후기알림톡", "리뷰체험단알림톡"
    ];

    try {
      const encodedFileName = encodeURIComponent(fileName);
      const fileRef = ref(storage, encodedFileName);
      const url = await getDownloadURL(fileRef);
      const response = await fetch(url);
      const data = await response.arrayBuffer();

      // 기존 엑셀 파일 읽기
      workbook = XLSX.read(data, { type: "array" });

      // "주문서" 시트가 있으면 데이터를 유지
      if (workbook.SheetNames.includes(sheetName)) {
        const worksheet = workbook.Sheets[sheetName];
        existingData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      }

    } catch (error) {
      console.warn("기존 엑셀 파일 없음. 새 파일 생성.");
      workbook = XLSX.utils.book_new();
    }

    // 기존 데이터가 없으면 헤더 추가
    if (existingData.length === 0) {
      existingData.push(headerRow);
    }

    // 새로운 주문 데이터 행 생성
    const newOrderRow = [
      orderData.orderId,
      orderData.customerName,
      orderData.customerContact,
      orderData.shop,
      orderData.earrings || "",
      orderData.earclip || "",
      orderData.bracelet8 || "",
      orderData.bracelet6 || "",
      orderData.bracelet3 || "",
      orderData.bracelet2 || "",
      orderData.ring || "",
      orderData.review || "",
      orderData.trackingNumber || "",
      orderData.deliveryDate ? orderData.deliveryDate.replace(/-/g, '').slice(2).replace(/(\d{2})(\d{2})(\d{2})/, '$1$2$3') : "",
      orderData.alimtalkOrder || "",
      orderData.alimtalkDelivery || "",
      orderData.alimtalkReview || ""
    ];

    // 기존 데이터에 새 주문 추가
    existingData.push(newOrderRow);

    // 새 워크시트 생성
    const newWorksheet = XLSX.utils.aoa_to_sheet(existingData);

    // 워크북에 워크시트 추가 또는 업데이트
    if (workbook.SheetNames.includes(sheetName)) {
      workbook.Sheets[sheetName] = newWorksheet;
    } else {
      XLSX.utils.book_append_sheet(workbook, newWorksheet, sheetName);
    }

    // 엑셀 파일을 Blob으로 변환
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    // Firebase Storage에 업로드
    const fileRef = ref(storage, fileName);
    await uploadBytesResumable(fileRef, blob);

    console.log("✅ 주문 정보가 엑셀에 성공적으로 업로드되었습니다!");
    return true;

  } catch (error) {
    console.error("주문 정보 업로드 오류:", error);
    throw error;
  }
}