export const HANOI_ADMIN_BOUNDARIES_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: {
        code: 'VN-HN-CITY',
        nameVi: 'Thành phố Hà Nội (Địa giới toàn thành phố)',
        adminLevel: 1,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [105.29, 21.18],
            [105.45, 21.28],
            [105.72, 21.38],
            [105.89, 21.35],
            [105.98, 21.14],
            [106.02, 20.99],
            [105.94, 20.82],
            [105.91, 20.62],
            [105.76, 20.57],
            [105.61, 20.75],
            [105.49, 20.89],
            [105.32, 21.02],
            [105.29, 21.18],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: {
        code: 'VN-HN-CORE',
        nameVi: 'Khu vực Nội đô Lịch sử (Ba Đình, Hoàn Kiếm, Đống Đa, Hai Bà Trưng)',
        adminLevel: 2,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [105.805, 21.052],
            [105.868, 21.052],
            [105.875, 20.992],
            [105.812, 20.992],
            [105.805, 21.052],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: {
        code: 'VN-HN-WEST-URBAN',
        nameVi: 'Khu vực Tây Hồ - Cầu Giấy - Bắc/Nam Từ Liêm - Thanh Xuân - Hà Đông',
        adminLevel: 2,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [105.715, 21.095],
            [105.835, 21.095],
            [105.812, 20.955],
            [105.715, 20.945],
            [105.715, 21.095],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: {
        code: 'VN-HN-EAST',
        nameVi: 'Khu vực Đông Hà Nội (Long Biên - Gia Lâm)',
        adminLevel: 2,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [105.868, 21.11],
            [106.015, 21.11],
            [106.015, 20.94],
            [105.875, 20.94],
            [105.868, 21.11],
          ],
        ],
      },
    },
  ],
};

