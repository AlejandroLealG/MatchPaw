import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeHost(statusFn: jest.Mock, jsonFn: jest.Mock): any {
  return {
    switchToHttp: () => ({
      getResponse: () => ({
        status: statusFn,
        json: jsonFn,
      }),
      getRequest: () => ({ method: 'GET', url: '/test' }),
    }),
  };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  });

  it('formatea HttpException con mensaje string', () => {
    const host = makeHost(statusMock, jsonMock);
    filter.catch(new HttpException('No encontrado', HttpStatus.NOT_FOUND), host);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'No encontrado' },
    });
  });

  it('formatea HttpException con objeto de respuesta personalizado', () => {
    const host = makeHost(statusMock, jsonMock);
    filter.catch(
      new HttpException(
        { code: 'DUPLICATE_ACTIVE_REQUEST', message: 'Ya existe solicitud activa' },
        HttpStatus.CONFLICT,
      ),
      host,
    );

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith({
      error: { code: 'DUPLICATE_ACTIVE_REQUEST', message: 'Ya existe solicitud activa' },
    });
  });

  it('formatea errores no-HTTP como 500 INTERNAL_ERROR', () => {
    const host = makeHost(statusMock, jsonMock);
    filter.catch(new Error('algo salió mal'), host);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
    });
  });

  it('incluye details cuando están presentes', () => {
    const host = makeHost(statusMock, jsonMock);
    filter.catch(
      new HttpException(
        { code: 'VALIDATION_ERROR', message: 'Campos inválidos', details: [{ field: 'email' }] },
        HttpStatus.UNPROCESSABLE_ENTITY,
      ),
      host,
    );

    const call = jsonMock.mock.calls[0][0] as { error: { details: unknown } };
    expect(call.error.details).toEqual([{ field: 'email' }]);
  });
});
