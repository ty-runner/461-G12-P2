import { Request, Response } from 'express';
import * as prismOperations from '../backend/prismaOperations';
import { getPackages } from '../backend/apiPackage';

jest.mock('../backend/prismaOperations');

describe('getPackageHistory', () => {
  it('should return package history when valid data is provided', async () => {
    const req : Partial<Request>= {
        query: {
            Version: '1.2.3',
            Name: "underscore"
        },
    };
    let responseObject = {};

    const res : Partial<Response>= {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnValue({
            json: jest.fn().mockImplementation((JSONdata) => {
                responseObject = JSONdata;
            })
        })
    };

    const mockData = [
      {
        name: 'packageName',
        version: '1.2.3',
        id: 'packageId',
      },
    ];

    (prismOperations.dbGetPackageMetaDataArray as jest.Mock).mockResolvedValue(mockData);

    await getPackages(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockData.map((data) => ({
      Name: data.name,
      Version: data.version,
      ID: data.id,
    })));
  });
});